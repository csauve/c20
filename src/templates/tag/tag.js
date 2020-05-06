const {html, wrapper, renderMarkdown, metabox, alert, tagAnchor, ul, heading, detailsList} = require("../shared");
const renderTagStructure = require("./tagStructure");

module.exports = (page, metaIndex) => {
  const tag = metaIndex.data.h1.tagsByName[page._slug];
  if (!tag) {
    throw new Error(`Failed to find tag structure for ${page.title}`);
  }

  const metaboxHtmlSections = [
    html`<p>Tag ID: <strong>${tag.id}</strong></p>`
  ];

  if (tag.parent) {
    metaboxHtmlSections.push(
      html`<p>Parent tag: ${tagAnchor(tag.parent, metaIndex)}</p>`
    );
  }

  let refDetailElements = [];
  let refLevel = tag;
  while (refLevel) {
    if (refLevel.references.length > 0) {
      const isDirect = refLevel.name == tag.name;
      const refLevelSummary = isDirect ?
        "Direct references" :
        `${tagAnchor(refLevel, metaIndex)} references`;

      refDetailElements.push(detailsList(
        refLevelSummary,
        refLevel.references.map(refTag => {
          if (refTag === "*") {
            //sound, effect, damage effect, sound looping, model animations, actor variants, and objects
            return "(any tags referenced by scripts)";
          } else {
            return tagAnchor(refTag, metaIndex);
          }
        }),
        isDirect ? undefined : false
      ));
    }
    refLevel = refLevel.parent;
  }

  if (refDetailElements.length > 0) {
    metaboxHtmlSections.push(refDetailElements.join("\n"));
  }

  if (tag.referencedBy.length > 0) {
    metaboxHtmlSections.push(detailsList(
      "Referenced by",
      tag.referencedBy.map(otherTag => tagAnchor(otherTag, metaIndex))
    ));
  }

  if (tag.children.length > 0) {
    metaboxHtmlSections.push(detailsList(
      "Child tags",
      tag.children.map(childTag => tagAnchor(childTag, metaIndex))
    ));
  }

  const metaboxOpts = {
    ...page,
    metaTitle: `\u{1F3F7} ${tag.name} (tag)`,
    metaColour: "#530000",
    metaIndex,
    mdSections: [
      page.info
    ],
    htmlSections: metaboxHtmlSections
  };

  //because we're adding headers to the page, should update the headers list for ToC
  const pageMetaForWrapper = {
    ...page,
    _headers: [
      ...page._headers,
      ...(!tag.invaderStruct ? [] : [
        {title: "Tag structure", id: "tag-structure", level: 1}
      ])
    ]
  };

  const htmlDoc = wrapper(pageMetaForWrapper, metaIndex, html`
    ${metabox(metaboxOpts)}
    ${tag.unused && alert("danger", html`
      <p>
        <strong>This tag is unused!</strong><br/>
        Although references to it exist in the engine or tools, it was removed during Halo's development.
      </p>
    `)}
    ${renderMarkdown(page._md, metaIndex)}
    ${tag.invaderStruct && renderTagStructure(tag, metaIndex)}
  `);

  const searchDoc = {
    path: page._path,
    title: page.title,
    text: renderMarkdown(page._md, metaIndex, true),
    keywords: (page.keywords || []).join(" ")
  };

  return {htmlDoc, searchDoc};
};