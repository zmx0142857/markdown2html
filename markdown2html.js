var Markdown2HTML = {};

(function() {

// token type
var LF = '\n', CODE = '`', CODEBLOCK = '```', ITALIC = '*', BOLD = '**', ITALICBOLD = '***', BULLET = '* ', CROSSOUT = '~~', HEADING = '#', HR = '====', SUBHR = '----', TEXT = 'text', LPAREN = '(', RPAREN = ')', LBRACK = '[', RBRACK = ']', LT = '<', GT = '>', IMG = '![', CHECKBOX = '[x]', PIPE = '|';

function read(files) {
	if (!files.length)
		return;
	var file = files[0];
	document.title = file.name;
	var reader = new FileReader();
	if (/text+/.test(file.type)) { // 判断是否为 text 类型
		reader.readAsText(file);
		reader.onload = function() {
			console.log(this.result);
			lexer('\n' + this.result);
		}
	}
}

// substr(begin, count)
// substring(begin, end)
function lexer(str) {
	var tokens = [];
	var i = 0;
	var level = 0;
	var text = '';
	function isSpace(ch) {
		return ch == ' ' || ch == '\t';
	}

	function ignoreSpace() {
		// if i == str.length, str[i] == undefined
		while (isSpace(str[i]))
			++i;
	}

	function combo(ch, limit) {
		level = 0;
		do {
			++i; ++level;
		} while (!(level > limit) && str[i] == ch);
	}

	function next(ch) {
		var begin = i;
		i = str.indexOf(ch, begin);
		if (i == -1)
			i = str.length;
		return str.substring(begin, i);
	}

	function pushToken(token) {
		if (text) {
			tokens.push({type:TEXT, text:text});
			text = '';
		}
		tokens.push(token);
	}
	
	while (i < str.length) {
		switch (str[i]) {
			case '\n': ++i;
				if (str[i] == '=') {
					combo('=');
					if (level >= 3)
						pushToken({type:HR});
					else
						pushToken({type:TEXT,
							text:str.substr(i-level,level)});
				} else if (str[i] == '-' && str[i+1] == '-') {
					combo('-');
					if (level < 3) {
						pushToken({type:TEXT,
							text:str.substr(i-level,level)});
					} else {
						ignoreSpace();
						if (str[i] == '|') {
							pushToken({type:SUBHR});
							next('\n');
						} else {
							pushToken({type:SUBHR});
						}
					}
				} else {
					pushToken({type:LF});
					if (str[i] == '#') {
						combo('#', 6);
						ignoreSpace();
						pushToken({type:HEADING, level:level});
					} else if ((str[i] == '*' || str[i] == '-')
							&& isSpace(str[i+1])) {
						i += 2;
						ignoreSpace();
						pushToken({type:BULLET, list:'ul', 
							task:(str[i-2] == '-'), level:0});
					} else if (str.substr(i, 2) == '1.'
							&& isSpace(str[i+2])) {
						i += 3;
						ignoreSpace();
						pushToken({type:BULLET, list:'ol', level:0});
					} else if (isSpace(str[i])) {
						combo(str[i]);
						if ((str[i] == '*' || str[i] == '-')
							&& isSpace(str[i+1])) {
							i += 2;
							ignoreSpace();
							pushToken({type:BULLET, list:'ul',
								task:(str[i-2] == '-'), level:level});
						} else if (str.substr(i, 2) == '1.'
								&& isSpace(str[i+2])) {
							i += 3;
							ignoreSpace();
							pushToken({type:BULLET, list:'ol',
								level:level});
						} else {
							text += str.substr(i-level, level);
						}
					} else if (str[i] == '>' && isSpace(str[i+1])) {
						++i;
						ignoreSpace();
						pushToken({type:GT});
					} else if (str.substr(i, 3) == '```') {
						i += 3;
						ignoreSpace();
						var begin = i;
						var lang = '';
						while (/\s/.test(str[i]) == false)
							lang += str[i++];
						++i;
						pushToken({type:CODEBLOCK, language:lang,
							text:next('```')});
						if (i < str.length)
							i += 3;
					}
				}
				break;
			case '*':
				combo('*', 3);
				if (level == 1)
					pushToken({type:ITALIC});
				else if (level == 2)
					pushToken({type:BOLD});
				else
					pushToken({type:ITALICBOLD});
				break;
			case '_':
				combo('_', 3);
				if (level == 1)
					pushToken({type:ITALIC});
				else if (level == 2)
					pushToken({type:BOLD});
				else
					pushToken({type:ITALICBOLD});
				break;
			case '~': ++i;
				if (str[i] == '~') {
					++i;
					pushToken({type:CROSSOUT});
				} else {
					text += '~';
				}
				break;
			case '`': ++i;  pushToken({type:CODE});	break;
			case '(': ++i;	pushToken({type:LPAREN});	break;
			case ')': ++i;	pushToken({type:RPAREN});	break;
			case '[': ++i;
				if (str.substr(i, 2) == 'x]') {
					i += 2;
					pushToken({type:CHECKBOX, checked:true});
				} else if (str.substr(i, 2) == ' ]') {
					i += 2;
					pushToken({type:CHECKBOX, checked:false});
				} else
					pushToken({type:LBRACK});
				break;
			case ']': ++i;	pushToken({type:RBRACK});	break;
			case '!': ++i;
				if (str[i] == '[') {
					++i;
					pushToken({type:IMG});
				} else {
					text += '!';
				}
				break;
			case '|': ++i; pushToken({type:PIPE});	break;
			default:
				while (/\n|\*|_|~|`|\(|\)|\[|\]|!|\|/
						.test(str[i]) == false)
					text += str[i++];
				ignoreSpace();
		}
	}
	console.log(tokens);
	grammar(tokens);
}

/* document	:= block blocks
 * blocks	:= \n block blocks | EMPTY
 * block	:= heading headings | item items | line lines | codeblock
 *
 * headings	:= heading headings | EMPTY
 * items	:= item items | EMPTY
 * lines	:= line lines | EMPTY
 *
 * heading	:= # line
 * item		:= * line
 * line		:= altline \n
 *
 * altline	:= xtext linetail
 * linetail	:= xtext linetail | EMPTY
 * xtext	:= TEXT | italic | bold | italicbold | crossout | code | link
 *
 * italic		:= * itext *
 * bold			:= ** btext **
 * italicbold	:= *** ibtext ***
 * crossout		:= ~~ crtext ~~
 * code			:= ` ctext `
 * link			:= ( altline ) [ altline ]
 */
function grammar(tokens) {
	var i = 0;
	var elem = document.getElementById('container');
	var node;
	var text = [];

	function insertNode(tag) {
		node = document.createElement(tag);
		elem.appendChild(node);
		elem = node;
	}

	function pushText() {
		text.push(tokens[i++].text);
	}

	function insertText() {
		node = document.createTextNode(text.join(' '));
		elem.appendChild(node);
		text = [];
	}

	function match_blocks() {
		while (i < tokens.length)
			match_block();
	}

	function match_block() {
		if (tokens[i].type == LF) {
			++i;
			return;
		} else if (tokens[i].type == HEADING) {
			match_headings();
		} else if (tokens[i].type == BULLET) {
			match_items(tokens[i]);
		} else if (tokens[i].type == CODEBLOCK) {
			insertNode('pre');
			elem.innerHTML = tokens[i++].text;
			elem = elem.parentElement;
		} else if (tokens[i+1].type == HR) {
			insertNode('h1');
			match_lines();
			insertText();
			elem = elem.parentElement;
		} else if (tokens[i+1].type == SUBHR) {
			insertNode('h2');
			match_lines();
			insertText();
			elem = elem.parentElement;
		} else if (tokens[i+1].type == PIPE) {
			insertNode('table');
			match_table();
			insertText();
			elem = elem.parentElement;
		} else if (tokens[i].type == GT) {
			insertNode('blockquote');
			match_quotes();
			insertText();
			elem = elem.parentElement;
		} else {
			insertNode('p');
			match_lines();
			insertText();
			elem = elem.parentElement;
		}
		if (i < tokens.length && tokens[i].type != LF)
			console.warn('token[' + i + ']: no eol but got '
				+ tokens[i].type + " '" + tokens[i].text + "'");
		++i;
	}

	function match_headings() {
		do
			match_heading();
		while (tokens[i].type == HEADING);
	}

	function match_items(token) {
		insertNode(token.list);
		if (token.task)
			elem.className = 'task-list';
		do
			match_item(token.level);
		while (tokens[i].list == token.list
			&& tokens[i].level == token.level);
		elem = elem.parentElement;
	}

	function match_table() {
		do
			match_tablerow('th');
		while (i < tokens.length && tokens[i].type != SUBHR);
		i += 2;
		do
			match_tablerow('td');
		while (i < tokens.length && tokens[i].type != LF);
	}

	function match_quotes() {
		do
			match_quote();
		while (tokens[i].type == GT);
	}

	function match_lines() {
		do
			match_line();
		while (i < tokens.length && tokens[i].type != LF);
	}

	function match_heading() {
		++i;
		insertNode('h' + tokens[i-1].level);
		match_line();
		insertText();
		elem = elem.parentElement;
	}

	function match_item(level) {
		++i;
		insertNode('li');
		match_line();
		insertText();
		if (tokens[i].level > level)
			match_items(tokens[i]);
		elem = elem.parentElement;
	}

	/*
	 * "first header" "|" "second header" "----" "\n"
	 * "cell1" "|" "cell2" "\n"
	 */
	function match_tablerow(type) {
		insertNode('tr');
		while (true) {
			insertNode(type);
			match_xtext();
			insertText();
			elem = elem.parentElement;
			if (i >= tokens.length || tokens[i].type == SUBHR) {
				break;
			} else if (tokens[i].type == PIPE) {
				++i;
				continue;
			} else if (tokens[i].type == LF) {
				++i;
				break;
			}
		}
		elem = elem.parentElement;
	}

	function match_quote() {
		++i;
		match_line();
	}

	function match_line() {
		match_altline();
		pushText();
	}

	function match_altline() {
		do
			match_xtext();
		while (i < tokens.length && tokens[i].type != LF);
	}

	function match_xtext() {
		switch (tokens[i].type) {
			case TEXT: pushText(); break;
			case HR: match_hr(); break;
			case SUBHR: match_hr(); break;
			case ITALIC: match_italic(); break;
			case BOLD: match_bold(); break;
			case ITALICBOLD: match_italicbold(); break;
			case CROSSOUT: match_crossout(); break;
			case CODE: match_code(); break;
			case IMG: match_img(); break;
			case LBRACK: match_link(); break;
			case CHECKBOX: match_checkbox(); break;
			default: text.push(tokens[i++].type); break;
		}
	}

	function match_hr() {
		++i;
		insertText();
		/*
		insertNode('hr');
		elem = elem.parentElement;
		*/
	}

	function match_italic() {
		++i;
		insertText();
		insertNode('em');
		while (tokens[i].type != ITALIC) {
			switch (tokens[i].type) {
				case TEXT: pushText(); break;
				case BOLD: match_bold(); break;
				default: text.push(tokens[i++].type); break;
			}
		}
		++i;
		insertText();
		elem = elem.parentElement;
	}

	function match_bold() {
		++i;
		insertText();
		insertNode('b');
		while (tokens[i].type != BOLD) {
			switch (tokens[i].type) {
				case TEXT: pushText(); break;
				case ITALIC: match_italic(); break;
				default: text.push(tokens[i++].type); break;
			}
		}
		++i;
		insertText();
		elem = elem.parentElement;
	}

	function match_italicbold() {
		++i;
		insertText();
		insertNode('em');
		insertNode('b');
		while (tokens[i].type != ITALICBOLD) {
			switch (tokens[i].type) {
				case TEXT: pushText(); break;
				case CROSSOUT: match_crossout(); break;
				default: text.push(tokens[i++].type); break;
			}
		}
		++i;
		insertText();
		elem = elem.parentElement;
		elem = elem.parentElement;
	}

	function match_crossout() {
		++i;
		insertText();
		insertNode('del');
		while (tokens[i].type != CROSSOUT) {
			switch (tokens[i].type) {
				case TEXT: pushText(); break;
				case ITALIC: match_italic(); break;
				case BOLD: match_bold(); break;
				case ITALICBOLD: match_italicbold(); break;
				default: text.push(tokens[i++].type); break;
			}
		}
		++i;
		insertText();
		elem = elem.parentElement;
	}

	function match_code() {
		++i;
		insertText();
		insertNode('code');
		while (tokens[i].type != CODE)
			text.push(tokens[i++].text);
		++i;
		insertText();
		elem = elem.parentElement;
	}

	function match_img() {
		++i;
		insertText();
		insertNode('img');
		while (tokens[i].type != RBRACK) {
			switch (tokens[i].type) {
				case TEXT: pushText(); break;
				case ITALIC: match_italic(); break;
				case BOLD: match_bold(); break;
				case CODE: match_code(); break;
				default: text.push(tokens[i++].type); break;
			}
		}
		++i;
		elem.alt = text.join(' ');
		text = [];
		if (!tokens[i++].type == LPAREN)
			console.warn("'(' must go right after ']'");
		elem.src = tokens[i++].text;
		if (!tokens[i++].type == RPAREN) {
			console.warn("expecting ')', got following:");
			console.log(tokens[i]);
		}
		elem = elem.parentElement;
	}

	function match_link() {
		++i;
		insertText();
		insertNode('a');
		while (tokens[i].type != RBRACK) {
			switch (tokens[i].type) {
				case TEXT: pushText(); break;
				case ITALIC: match_italic(); break;
				case BOLD: match_bold(); break;
				case CODE: match_code(); break;
				default: text.push(tokens[i++].type); break;
			}
		}
		++i;
		insertText();
		if (!tokens[i++].type == LPAREN)
			console.warn("'(' must go right after ']'");
		elem.href = tokens[i++].text;
		if (!tokens[i++].type == RPAREN) {
			console.warn("expecting ')', got following:");
			console.log(tokens[i]);
		}
		elem = elem.parentElement;
	}

	function match_checkbox() {
		insertText();
		insertNode('input');
		elem.type = 'checkbox';
		elem.checked = tokens[i++].checked;
		elem = elem.parentElement;
	}

	match_blocks();
}

function run(files) {
	document.getElementById('container').innerHTML = '';
	read(files);
}

//expose some functions to outside
Markdown2HTML.run = run;
})();
