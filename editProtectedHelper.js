// <nowiki>
// only enable this on the latest revision of the page
if(mw.config.get('wgRevisionId') == mw.config.get('wgCurRevisionId')) {
	mw.loader.load('mediawiki.api.edit');
	$(document).ready(function() {
		var templateResponses = [
			[ '', '(No template response)' ],
			[ 'd', 'Done' ],
			[ 'pd', 'Partly done:' ],
			[ 'nd', 'Not done:' ],
			[ 'nfn', 'Not done for now:' ],
			[ 'c', 'Not done: please establish a consensus for this alteration before using the {{edit protected}} template.'] , // TODO make dynamic
			[ 'rs', 'Not done: please provide reliable sources that support the change you want to be made.' ],
			[ '?', 'Not done: please be more specific about what needs to be changed.' ],
			[ 'mis', 'Not done: this is the talk page for discussing improvements to the template {{EP}}. Please make your request at the talk page for the article concerned.'] , // TODO make dynamic
			[ 'sb', 'Not done: please make your requested changes to the template\'s sandbox first; see WP:TESTCASES.' ],
			[ 'tp', 'Not done: this is the talk page for discussing improvements to the template {{EP}}. If possible, please make your request at the talk page for the article concerned. If you cannot edit the article\'s talk page, you can instead make your request at Wikipedia:Requests for page protection#Current requests for edits to a protected page.' ],
			[ 'xy', 'Not done: please make your request in a "change X to Y" format.' ],
			[ 'a', 'Already done' ],
			[ 'hr', 'Not done: According to the page\'s protection level and your user rights, you should currently be able to edit the page yourself. If you still seem to be unable to, please reopen the request with further details.'] ,
			[ 'doc', 'Not done: {{edit protected}} is usually not required for edits to the documentation, categories, or interlanguage links of templates using a documentation subpage. Use the \'edit\' link at the top of the green "Template documentation" box to edit the documentation subpage.' ],
			[ 'drv', 'Not done: requests for recreating deleted pages protected against creation should be made at Wikipedia:Deletion review.' ],
			[ 'r', 'Not done: requests for increases to the page protection level should be made at Wikipedia:Requests for page protection.' ],
			[ 'ru', 'Not done: requests for decreases to the page protection level should be directed to the protecting admin or to Wikipedia:Requests for page protection if the protecting admin is not active or has declined the request.' ],
			[ 'p', 'Not done: this is not the right page to request additional user rights. You may reopen this request with the specific changes to be made and someone will add them for you.'] , // TODO make dynamic
			[ 'm', 'Not done: page move requests should be made at Wikipedia:Requested moves.' ],
			[ 'q', 'Question:' ],
			[ 'n', 'Note:' ],
			[ 'udp', 'Undone: This request (or the completed portion of it) has been undone.' ],
			[ 'ud', 'Undone: This request has been undone.' ]
		];
		var quickResponses = [
			[ 'd', '', 'Done'],
			[ 'rs', '', 'Needs RS'],
			[ '?', '', 'Unclear'],
			[ 'xy', '', 'X to Y'],
			[ 'hr', '', 'Can edit'],
			[ 'mis', '', 'Misplaced']
		];
		var selector = $('.editrequest .mbox-text'), parsoidDom;
		var selectedLevel = { semi: [' selected="selected"', '', ''], template: ['', ' selected="selected"', ''], full: ['', '', ' selected="selected"'] };
		var templateLevel = { semi: 'semi-', template: 'template-', full: '' };
		var responseLevel = { semi: '{' + '{subst:ESp|', template: '{' + '{subst:ETp|', full: '{' + '{subst:EP|' };
		var sptemplates = /^[Ee]dit semi-protected$/, tptemplates=/^[Ee]dit template-protected$/;
		function isYes(val) {
			return val == 'yes' || val == 'y' || val == 'true' || val == 1;
		}
		function getBanner(level, pagename, answered, force, demo) {
			return "\n{{edit " + templateLevel[level] + 'protected|' + (pagename === '' ? '<!-- Page to be edited -->' : pagename) + '|answered=' + (answered ? 'yes' : 'no') + (force ? '|force=yes' : '') + (demo ? '|demo=yes}}' : '}}');
		}
		function getResponse(level, template, free) {
			return ':' + (template === '' ? '' : responseLevel[level] + template + '}} ') + (free === '' ? '' : free + ' ') + '~~' + "~~\n";
		}
		function makeUniqueString(index) {
			// this looks like a strip marker on purpose
			return "\x7fUNIQ" + Math.random().toString(16).substr(2) + '-editProtectedHelper-' + index + "-QINU\x7f";
		}
		function saveWikitextFromParsoid(data) {
			var newWikitext, removerequest = false;
			if(this.removerequest) {
				var tmp = data.split(this.templateMarker);
				removerequest = true;
				newWikitext = tmp[0];
				if(this.respondedInPage) {
					var tmp = tmp[1].split(this.responseMarker);
					newWikitext = newWikitext.replace(/\n+$/, '') + "\n\n" + tmp[1].replace(/^\n+/, '');
				}
			} else {
				var response = getResponse(this.form.level.value, this.form.responsetemplate.value, this.form.responsefree.value);
				var banner = getBanner(this.form.level.value, this.form.pagetoedit.value, this.form.answered.checked, this.form.force.checked, this.demo);
				// prevent empty response
				if(response == ':~~' + "~~\n") {
					response = '';
				}
				var tmp = data.split(this.templateMarker);
				newWikitext = tmp[0].replace(/\n*$/, "\n") + banner + tmp[1].replace(/^\n*/, "\n");
				if(this.respondedInPage) {
					tmp = newWikitext.split(this.responseMarker);
					newWikitext = tmp[0].replace(/\n*$/, "\n") + response + tmp[1].replace(/^\n*/, "\n");
				} else {
					newWikitext = newWikitext.replace(/\n*$/, "\n") + response;
				}
			}
			var resultObj = this.resultObj, sectionName = this.section.text();
			console.log(newWikitext);
			resultObj.text('Saving...');
			if(confirm("Really edit the page?")) {
				new mw.Api().get( { action: 'query', prop: 'revisions', rvprop: 'timestamp', revids: mw.config.get('wgRevisionId') }).done(function(data) {
					new mw.Api().postWithEditToken( { action: 'edit', pageid: mw.config.get('wgArticleId'), text: newWikitext, summary: (sectionName ? '/' + '* ' + sectionName.trim() + ' *' + '/ ' : '') + (removerequest ? 'Removed' : 'Responded to') + ' edit request ([[WP:EPH|EPH]])', notminor: true, nocreate: true, basetimestamp: data.query.pages[mw.config.get('wgArticleId')].revisions[0].timestamp } ).done(function() {
						resultObj.css('color', 'green').text('Success: Reloading page...');
						location.reload();
					}).fail(function(err) {
						resultObj.css('color', 'red').text('Error: ' + err);
						console.log.apply(undefined, arguments);
					});
				});
			}
		}
		function convertModifiedDom(e) {
			var parsoidObj, nextRequestBeforeHeader = false;
			$('.editrequest button').prop('disabled', true);
			parsoidObj = e.data;
			parsoidObj.resultObj.text('Preparing new wikitext...');
			$(parsoidObj).before(parsoidObj.templateMarker);
			$('h1,h2,h3,h4,h5,h6,.editrequest', parsoidDom).each(function() {
				var obj = $(this);
				if(!obj.hasClass('editrequest')) {
					// a heading
					if(obj.closest('[typeof="mw:Transclusion"]').length) {
						// it's from a template transclusion. ignore
						return true;
					}
					if(obj.add(parsoidObj)[0] === this) {
						// before our banner. set as our section header (tentatively) and otherwise ignore
						parsoidObj.section = obj;
						return true;
					}
				} else if (obj.add(parsoidObj)[0] === this) {
					// not after our banner. ignore
					return true;
				} else {
					nextRequestBeforeHeader = true;
				}
				obj.before(parsoidObj.responseMarker);
				parsoidObj.respondedInPage = true;
				return false;
			});
			if(parsoidObj.removerequest && !nextRequestBeforeHeader && $(parsoidObj).prev().is(parsoidObj.section)) {
				// if the section header is immediately before a request being removed, remove it too
				parsoidObj.section.remove();
			}
			$('[about="' + $(parsoidObj).attr('about').replace('\\', '\\\\').replace('"', '\\"') + '"]', parsoidDom).remove();
			$.post('//parsoid.wmflabs.org/enwiki/' + escape(mw.config.get('wgPageName')), { oldid: mw.config.get('wgRevisionId'), html: parsoidDom.documentElement.outerHTML }, saveWikitextFromParsoid.bind(parsoidObj));
		}
		function appendForm(obj, level, pagename, answered, force, parsoidObj) {
			var form = $('<form class="editProtectedHelper" style="display: none" />');
			form.append('<label>Level: <select name="level"><option value="semi"' + selectedLevel[level][0] + '>Semi-protected</option><option value="template"' + selectedLevel[level][1] + '>Template-protected</option><option value="full"' + selectedLevel[level][2] + '>Fully protected</option></select></label> ');
			if(force) {
				form.append('<label>Disable protection level autodetection (use only if necessary): <input type="checkbox" name="force" checked="checked" /></label> ' );
			} else {
				form.append('<input type="checkbox" name="force" style="display: none" />' ); // if this is off and you want to turn it on, do it with firebug or something. otherwise people will use this when they shouldn't
			}
			var label = $('<label>Page to be edited: </label>');
			label.append($('<input type="text" name="pagetoedit" />').attr('value', pagename !== '<!-- Page to be edited -->' ? pagename : ''));
			form.append(label);
			form.append(' <label>Answered: <input type="checkbox" name="answered"' + (answered ? ' checked="checked"' : '') + ' /></label><br />Response: ');
			var select = $('<select name="responsetemplate" style="width: 100%" />');
			templateResponses.forEach(function(r) {
				select.append($('<option />').attr('value', r[0]).text(r[1]));
			});
			form.append(select);
			form.append('<textarea name="responsefree"></textarea> ~~' + '~~ ')
			var resultObj = $('<span></span>');
			var button = $('<button type="button">Submit</button>').click(parsoidObj, convertModifiedDom);
			form.append(button);
			form.append(' ');
			$(obj).append(form);
			var buttons = $('<span />');
			var showform = $('<button type="button">Respond</button>').click(function(){
				buttons.hide();
				$(obj).closest('.editrequest').removeClass('mbox-small');
				form.show();
			});
			buttons.append(showform);
			buttons.append($('<button type="button" style="color: red">Remove request</button>').click(function(){
				if(!confirm('WARNING: This feature is HIGHLY EXPERIMENTAL and may blank incorrect portions of the page. Please check any edits made with this function. Are you sure you want to remove this edit request from the page?')) {
					return;
				}
				parsoidObj.removerequest = true;
				button.click();
			}));
			if(!answered) {
				quickResponses.forEach(function(r){
					buttons.append($('<button type="button" />').text(r[2]).click(function(){
						parsoidObj.form.answered.checked = true;
						parsoidObj.form.responsetemplate.value = r[0];
						parsoidObj.form.responsefree.value = r[1];
						button.click();
					}));
				});
			}
			$(obj).append(buttons);
			$(obj).append(resultObj);
			parsoidObj.form = form[0];
			parsoidObj.resultObj = resultObj;
		}
		function parsoidSetupFieldsForTemplate(index) {
			var data_mw = JSON.parse($(this).attr('data-mw'));
			var templateName = data_mw.parts[0].template.target.wt;
			var level = sptemplates.test(templateName) ? 'semi' : tptemplates.test(templateName) ? 'template' : 'full';
			var params = [];
			for(var key in data_mw.parts[0].template.params) {
				params[key] = data_mw.parts[0].template.params[key].wt;
			}
			
			// this only runs on numerical parameters
			params.forEach(function(value, key) {
				if(/=/.test(value)) {
					params[key] = key + '=' + value;
				}
			});
			
			var pagename = params.join('|').replace(/^\|+|\|+$/g, '').replace(/\|+/g, '|');
			var answered = isYes(params['ans'] || params['answered']);
			this.demo = isYes(params['demo']);
			var force = isYes(params['force']);
			this.params = params;
			this.templateMarker = makeUniqueString(2 * index);
			this.responseMarker = makeUniqueString(2 * index + 1);
			appendForm(selector[index], level, pagename, answered, force, this);
		}
		function onParsoidDomReceived(data) {
			parsoidDom = new DOMParser().parseFromString(data, 'text/html');
			var parsoidSelector = $('.editrequest', parsoidDom);
			if(selector.length != parsoidSelector.length) {
				console.log('Sanity check failed: ' + selector.length + ' edit requests exist in the page but only ' + parsoidSelector.length + ' were found in Parsoid\'s output.');
				return;
			}
			parsoidSelector.each(parsoidSetupFieldsForTemplate);
		}
		if(selector.length) {
			$.get('//parsoid.wmflabs.org/enwiki/' + escape(mw.config.get('wgPageName')) + '?oldid=' + mw.config.get('wgRevisionId'), onParsoidDomReceived);
		}
	});
}
// </nowiki>
