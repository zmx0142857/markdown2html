var Markdown2HTML = {};

(function() {
	// token type
	var LF = '\n', CODE = '`', CODEBLOCK = '```', LINK = 'link', ITALIC = '*', BOLD = '**', ITALICBOLD = '***', BULLET = '* item', CROSSOUT = '~~', HEADING = '#', TITLE = '====', SUBTITLE = '----', TEXT = 'text';

	function read(files) {
		if (files.length) {
			var file = files[0];
			var reader = new FileReader();
			if (/text+/.test(file.type)) { // 判断是否为 text 类型
				reader.readAsText(file);
				reader.onload = function() {
					console.log(this.result);
					lexer('\n' + this.result);
				}
			}
		}
	}

	function lexer(str) {
		var tokens = [];
		var i = 0;
		var text = '';
		var level = 0;
		function isSpace(ch) {
			return ch == ' ' || ch == '\t';
		}

		function ignoreSpace() {
			// ignore space, get undefined if i == str.length
			while (isSpace(str[i])) ++i;
		}

		function repeat(ch, limit) {
			level = 0;
			do {
				++i; ++level;
			} while (!(level > limit) && str[i] == ch);
		}

		while (i < str.length) {
			switch (str[i]) {
				case '\n': ++i;
					if (str[i] == '=') {
						repeat('=');
						if (level >= 4)
							tokens.push({type:TITLE});
						else
							text += str.substr(i-level,level);
					} else if (str[i] == '-') {
						repeat('-');
						if (level >= 4)
							tokens.push({type:SUBTITLE});
						else
							text += str.substr(i-level,level);
					} else {
						tokens.push({type:LF});
						if (str[i] == '#') {
							repeat('#', 6);
							ignoreSpace();
							var begin = i;
							i = str.indexOf('\n', begin);
							if (i != -1) {
								tokens.push({type:HEADING, level:level,
									text:str.substring(begin, i)});
							} else {
								token.push({type:HEADING, level:level,
									text:str.substr(begin)});
								i = str.length;
							}
						} else if (str[i] == '*' && isSpace(str[i+1])) {
							++i;
							ignoreSpace();
							tokens.push({type:BULLET});
						} else if (str.substr(i, 3) == '```') {
							i += 3;
							var begin = i;
							i = str.indexOf('```', begin);
							if (i != -1) {
								tokens.push({type:CODEBLOCK,
										text:str.substring(begin, i)});
								i += 3;
							} else {
								tokens.push({type:CODEBLOCK,
									text:str.substr(begin)});
								i = str.length;
							}
						}
					}
					break;
				case '`': ++i;  tokens.push({type:CODE});	break;
				case '[':
					var begin = ++i;
					i = str.indexOf(']', begin);
					if (i != -1) { // matched [ ]
						var text = str.substr(begin, i);
						begin = ++i;
						i = str.indexOf('(', begin);
						if (i != -1) { // matched [ ] (
							var inner_text = str.substr(begin, i);
							begin = ++i;
							i = str.indexOf(')', begin);
							if (i != -1) { // matched [ ] ( )
								tokens.push({type:LINK, text:text,
									src:str.substr(begin, i)});
							} else { // matched [ ] ( eof
								tokens.push({type:TEXT, text:
									'[' + text + ']' + inner_text + '('});
								i = begin;
							}
						} else { // matched [ ] eof
							tokens.push({type:text, text: '[' + text + ']'});
							i = begin;
						}
					} else { // matched [ eof
						tokens.push({type:TEXT, text:'['});
						i = begin;
					}
					break;
				case '*':
					repeat('*', 3);
					if (level == 1)
						tokens.push({type:ITALIC});
					else if (level == 2)
						tokens.push({type:BOLD});
					else
						tokens.push({type:ITALICBOLD});
					break;
				case '_':
					repeat('_', 3);
					if (level == 1)
						tokens.push({type:ITALIC});
					else if (level == 2)
						tokens.push({type:BOLD});
					else
						tokens.push({type:ITALICBOLD});
					break;
				case '~': ++i;
					if (str[i] == '~') {
						++i;
						tokens.push({type:CROSSOUT});
					} else {
						text += '~';
					}
					break;
				default:
					while (/\n|`|\(|\)|\[|\]|\*|_|~/
							.test(str[i]) == false) {
						text += str[i++];
					}
					ignoreSpace();
					tokens.push({type:TEXT, text:text});
					text = '';
			}
		}
		console.log(tokens);
		grammar(tokens);
	}

	/* document	:= block blocks
	 * blocks	:= \n block blocks | EMPTY
	 * block	:= heading headings | item items | line lines
	 * headings	:= heading headings | EMPTY
	 * items	:= item items | EMPTY
	 * lines	:= line lines | EMPTY
	 * heading	:= # line
	 * item		:= * line
	 * line		:= altline \n
	 * altline	:= xtext linetail		(check if available)
	 * linetail	:= xtext linetail | EMPTY
	 * xtext	:= TEXT | italic | bold | code | link
	 * italic	:= _ itext _
	 * bold		:= * btext *
	 * code		:= ` ctext `
	 * link		:= ( altline ) [ altline ]
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
				insertNode('h' + tokens[i].level);
				elem.innerHTML = tokens[i++].text;
				elem = elem.parentElement;
			} else if (tokens[i].type == BULLET) {
				insertNode('ul');
				match_items();
				elem = elem.parentElement;
			} else if (tokens[i].type == CODEBLOCK) {
				insertNode('pre');
				elem.innerHTML = tokens[i++].text;
				elem = elem.parentElement;
			} else {
				insertNode('p');
				match_lines();
				insertText();
				elem = elem.parentElement;
			}
			if (i < tokens.length && tokens[i].type != LF)
				console.warn('no eol (but got ' + tokens[i].type + ')');
			++i;
		}

		function match_headings() {
			do
				match_heading();
			while (tokens[i].type == HEADING);
		}

		function match_items() {
			do
				match_item();
			while (tokens[i].type == BULLET);
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

		function match_item() {
			++i;
			insertNode('li');
			match_line();
			insertText();
			elem = elem.parentElement;
		}

		function match_line() {
			match_altline();
			if (tokens[i].type != LF) {
				console.error(i + ': expecting lf, got ' + tokens[i].type);
			}
			++i;
		}

		function match_altline() {
			do
				match_xtext();
			while (i < tokens.length && tokens[i].type != LF);
		}

		function match_xtext() {
			var matched = false;
			switch (tokens[i].type) {
				case TEXT: pushText(); break;
				case ITALIC: match_italic(); break;
				case BOLD: match_bold(); break;
				case CODE: match_code(); break;
				case LBRACK: match_link(); break;
				default: text.push(tokens[i++].type); break;
			}
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

		function match_code() {
			++i;
			insertNode('pre');
			while (tokens[i].type != CODE)
				text.push(tokens[i++].type);
			insertText();
			elem = elem.parentElement;
		}

		function match_link() {
			++i;
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
				console.error("'[' must go right after ')'");
			elem.href = tokens[i++].text;
			text = [];
			if (!tokens[i++].type == RPAREN)
				error('expecting ], got ' + tokens[i].type);
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
