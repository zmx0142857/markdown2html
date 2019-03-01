#include <iostream>
#include <string>
#include <cctype>
using namespace std;

const int p = 0;
const int h1 = 1;
const int h2 = 2;
const int h3 = 3;
const int h4 = 4;
const int h5 = 5;
const int h6 = 6;
const int ul = 7;

void end_block(const int block_type)
{
    switch (block_type)
    {
	case p: cout << "</p>\n"; break;
	case h1: cout << "</h1>\n"; break;
	case h2: cout << "</h2>\n"; break;
	case h3: cout << "</h3>\n"; break;
	case h4: cout << "</h4>\n"; break;
	case h5: cout << "</h5>\n"; break;
	case h6: cout << "</h6>\n"; break;
	case ul: cout << "</ul>\n"; break;
    }
}

string parse(const string &line, bool skip=true)
{
    size_t b = 0;
    if (skip)
    {
	// put b in correct position: ignore * and #
	while (b < line.size() && isspace(line[b])) ++b;
	while (b < line.size() && !isspace(line[b])) ++b;
	while (b < line.size() && isspace(line[b])) ++b;
    }

    // parse emphasis
    string parse_em;
    bool open = true;
    for (size_t e = 0; e < line.size(); ++e)
    {
        if (line[e] == '_')
	{
	    parse_em += line.substr(b, e-b);
	    parse_em += open ? "<em>" : "</em>";
	    open = !open;
	    b = e+1;
	}
    }
    parse_em += line.substr(b);

    // parse link
    string ret, caption, href;
    b = 0;
    for (size_t e = 0; e < parse_em.size(); ++e)
    {
        if (parse_em[e] == '[')
	{
	    ret += parse_em.substr(b, e-b);
	    ret += "<a href=";
	    b = e+1;
	}
	else if (parse_em[e] == ']')
	{
	    caption = parse_em.substr(b, e-b);
	    // ignore all characters between ] and (
	    for (b = e+1; b < parse_em.size() && parse_em[b] != '('; ++b);
	    while (e < parse_em.size() && parse_em[e] != ')') ++e;
	    // skip (
	    ++b;
	    ret += '"' + parse_em.substr(b, e-b) + "\">" + caption + "</a>";
	    b = e+1;
	}
    }
    ret += parse_em.substr(b);
    
    return ret;
}

int main()
{
    string line;
    bool last_isempty = true;
    int block_type = p;
    while (getline(cin, line))
    {
	if (line.empty())
	{
	    if (!last_isempty)
		end_block(block_type);
	    last_isempty = true;
	}
	else
	{
	    if (line[0] == '*') // bullet list
	    {
		block_type = ul;
		if (last_isempty)
		    cout << "<ul>\n";
		cout << "<li>" << parse(line) << "</li>\n";
	    }
	    else if (line[0] == '#') // heading
	    {
		block_type = h1;
		for (size_t i = 1; i < 6 && i < line.size() && line[i] ==
			'#'; ++i)
		    ++block_type;
		cout << "<h" << block_type << ">" << parse(line);
	    }
	    else // p
	    {
	        block_type = p;
		if (last_isempty)
		    cout << "<p>";
		else
		    cout << '\n';
		cout << parse(line, false);
	    }
	    last_isempty = false;
	}
    }
    if (!last_isempty)
	end_block(block_type);
    return 0;
}
