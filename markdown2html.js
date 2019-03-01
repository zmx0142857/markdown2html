var Markdown2HTML = {};

(function() {
	// token type
	var LF = '\n', HARSH = '#', UNDERSCORE = '_', ASTERISK = '*', BACKQUOTE = '`', LPAREN = '(', RPAREN = ')', LBRACK = '[', RBRACK = ']', LBRACE = '{', RBRACE = '}', TEXT = 'text';

	function read(files) {
		if (files.length) {
			var file = files[0];
			var reader = new FileReader();
			if (/text+/.test(file.type)) { // 判断是否为 text 类型
				reader.readAsText(file);
				reader.onload = function() {
					//console.log(this.result);
					lexer(this.result);
				}
			}
		}
	}

	function lexer(str) {
		var tokens = [];
		var i = 0;
		while (i < str.length) {
			function ignoreSpace() {
				// ignore space, get undefined if i == str.length
				while (str[i] == ' ' || str[i] == '\t')
					++i;
			}

			function getLevel(ch) {
				do {
					++i;
					++level;
				} while (str[i] == ch);
				return level;
			}

			var level = 0;
			var text = '';
			switch (str[i]) {
				case '\n': tokens.push({type:LF}); ++i; ignoreSpace();
					break;
				case '`': tokens.push({type:BACKQUOTE}); ++i; break;
				case '(': tokens.push({type:LPAREN}); ++i; break;
				case ')': tokens.push({type:RPAREN}); ++i; break;
				case '[': tokens.push({type:LBRACK}); ++i; break;
				case ']': tokens.push({type:RBRACK}); ++i; break;
				//case '{': tokens.push({type:LBRACE}); ++i; break;
				//case '}': tokens.push({type:RBRACE}); ++i; break;
				case '*': tokens.push({type:ASTERISK, level:getLevel('*')}); break;
				case '_': tokens.push({type:UNDERSCORE, level:getLevel('_')}); break;
				case '#': level = getLevel('#'); tokens.push({type: HARSH, level:level > 6 ? 6 : level}); break;
				default:
					while (/\n|`|\(|\)|\[|\]|\{|\}|\*|_|#/.test(str[i]) == false) {
						text += str[i++];
					}
					tokens.push({type:TEXT, text:text});
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

		function insertText() {
			node = document.createTextNode(text.join(' '));
			elem.appendChild(node);
			text = [];
		}

		function match_blocks() {
			do {
				match_block();
			} while (i < tokens.length && tokens[i++].type == LF);
		}

		function match_block() {
			if (tokens[i].type == HARSH) {
				match_headings();
			} else if (tokens[i].type == ASTERISK) {
				insertNode('ul');
				match_items();
				elem = elem.parentElement;
			} else {
				insertNode('p');
				match_lines();
				insertText();
				elem = elem.parentElement;
			}
			if (i < tokens.length && tokens[i].type != LF) {
				console.error(i + ': expecting lf, got ' + tokens[i].type);
			}
		}

		function match_headings() {
			do
				match_heading();
			while (tokens[i].type == HARSH);
		}

		function match_items() {
			do
				match_item();
			while (tokens[i].type == ASTERISK);
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
				case TEXT: text.push(tokens[i++].text); break;
				case UNDERSCORE: match_ib(UNDERSCORE, ASTERISK); break;
				case ASTERISK: match_ib(ASTERISK, UNDERSCORE); break;
				case BACKQUOTE: match_code(); break;
				case LBRACK: match_link(); break;
				default: text.push(tokens[i].type); ++i; break;
			}
		}

		function match_ib(type, othertype) {
			var level = tokens[i].level;
			if (level == 1)
				match_italic(type, othertype);
			else if (level == 2)
				match_bold(type, othertype);
			else
				console.error('invalid level' + level);
		}

		function match_italic(type, othertype) {
			++i;
			insertText();
			insertNode('em');
			while (tokens[i].type != type) {
				switch (tokens[i].type) {
					case TEXT: text.push(tokens[i++].text); break;
					case othertype: match_ib(othertype, type); break;
					default: text.push(tokens[i].type); ++i; break;
				}
			}
			++i;
			insertText();
			elem = elem.parentElement;
		}

		function match_bold(type) {
			++i;
			insertText();
			insertNode('b');
			while (tokens[i].type != type) {
				switch (tokens[i].type) {
					case TEXT: text.push(tokens[i++].text); break;
					case othertype: match_ib(othertype, type); break;
					default: text.push(tokens[i].type); ++i; break;
				}
			}
			++i;
			insertText();
			elem = elem.parentElement;
		}

		function match_code() {
			++i;
			insertNode('pre');
			while (tokens[i].type != BACKQUOTE) {
				text.push(tokens[i++].type);
			}
			insertText();
			elem = elem.parentElement;
		}

		function match_link() {
			++i;
			insertNode('a');
			while (tokens[i].type != RBRACK) {
				switch (tokens[i].type) {
					case TEXT: text.push(tokens[i++].text); break;
					case UNDERSCORE: match_ib(UNDERSCORE, ASTERISK); break;
					case ASTERISK: match_ib(ASTERISK, UNDERSCORE); break;
					case BACKQUOTE: match_code(); break;
					default: text.push(tokens[i].type); ++i; break;
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
		read(files);
	}

//expose some functions to outside
Markdown2HTML.run = run;
})();
