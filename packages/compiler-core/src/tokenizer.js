export const State = {
    Text: 1,
     // interpolation
  InterpolationOpen: 2,
  Interpolation: 3,
  InterpolationClose: 4,

  // Tags
  BeforeTagName: 5, // After <
  InTagName: 6,
  InSelfClosingTag: 7,
  BeforeClosingTagName: 8,
  InClosingTagName: 9,
  AfterClosingTagName: 10,

  // Attrs
  BeforeAttrName: 11,
  InAttrName: 12,
  InDirName: 13,
  InDirArg: 14,
  InDirDynamicArg: 15,
  InDirModifier: 16,
  AfterAttrName: 17,
  BeforeAttrValue: 18,
  InAttrValueDq: 19, // "
  InAttrValueSq: 20, // '
  InAttrValueNq: 21,

  // Declarations
  BeforeDeclaration: 22, // !
  InDeclaration: 23,

  // Processing instructions
  InProcessingInstruction: 24, // ?

  // Comments & CDATA
  BeforeComment: 25,
  CDATASequence: 26,
  InSpecialComment: 27,
  InCommentLike: 28,

  // Special tags
  BeforeSpecialS: 29, // Decide if we deal with `<script` or `<style`
  BeforeSpecialT: 30, // Decide if we deal with `<title` or `<textarea`
  SpecialStartSequence: 31,
  InRCDATA: 32,

  InEntity: 33,

  InSFCRootTagName: 34,
}
function tokenizer(str) {

}