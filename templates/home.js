const {html} = require("common-tags");
const {wrapper, ul, pageAnchor} = require("./shared");

module.exports = (page, metaIndex) => wrapper({
  page,
  metaIndex,
  body: html`
    <h1>${page.title}</h1>
    ${page._md}
    ${ul(metaIndex.pages.map((page) => pageAnchor(page)))}
  `
});
