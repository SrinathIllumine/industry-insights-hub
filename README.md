# Industry Insights Hub

I want to make the following app - 'Industry Research Engine':

The main page should have circles with the industry names I want to keep a record of. 

For now, I want have the following industries - Auto & auto ancillaries, Pharma, Retail, FMCG, Building Materials, BFSI.

Later I should have the option to add / edit industries.

Inside each industry, similarly I need to have 'Company Research Profile'.

I should be able to add / edit companies of my choice.

Each company will have its own 5 blocks - I will feed the raw information / data/ charts (drag and drop) - the app should be intelligent enough to present it as expected in the attachment. I will give / dump data in any form - it can also be an MD file dump from claude. Or I should also be able to add the details based on the structure I gave in the attachment (specification image).

Blocks

1) Financials:

It should show a table with past few FYs revenue, net profit/loss, EBITDA, PAT (with color grading for metric - green / orange / red based on the sense of the data)

Last few years revenue CAGR %

Industry revenue CAGR %

(then a click-in to see where the company stands in the industry with the help of a chart image)

Overall verdict: <financial_tags> -- high / moderate / low performing

2) Overall Business Challenge / Aspiration

(it should be in the following format:)

Theme / Category A:

-- Actual Problem

-- Quote from stakeholders (if any)

-- <Tags> – Company-wide business problem (or) BU-specific

Theme / Category B (if present)

-- Actual Problem

-- Quote from stakeholders (if any)

-- <Tags> – Company-wide business problem (or) BU-specific

The themes should be finite. Here are some of the themes:

Preserving Market Leadership in a specific product/ business line

Dealing with intense competition and potential loss of market position (e.g. number 2 position) & reduced morale

Increased funding for aggressive growth/ expansion of business - more dealers/ network growth

Increase production capacity in new areas/ locations leading to more dealers

Some more themes can come - but it should be finite

3) Business Verticals

 For the verticals that I give, it should show like verticals (as in the attachment). Next to each line of the BV, a one-liner description, basic details & revenue details should be shown there itself.

There should be click-ins for stakeholders, channel engagement model and Illumine's potential contributions which should open up as popups.

4) Company-level research

A table with all the company's initiatives with the fields like area, category, initiative, what it does, how it is done should be shown.

5) Partner contributions

I want to store and keep track of all whatever partner contributes to the company from initial conversations to final delivery. It should show all the engagements neatly.

Note:

i) The end user will be my company leadership who will look into this to take decisions

ii) When I enter these information, I should have the option to edit while adding new data and then save it - so, after saving it should look readable for me as well for the leadership

iii) Allow me to edit common structures or themes in a setting page kind of setup. For example, I should be able to set those pre-defined themes in the settings - and in the edit page, it should allow me to select from those themes. Similarly, apply this wherever applicable.

iv) Attached in the image of one company profile template which the app should enable me to edit and add relevant information.

v) All these should be saved somewhere and be retrieved while accessing the site - no login needed (all these are publicly available information)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/75277a89-0df2-456b-a912-9c995ecb0b36).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
