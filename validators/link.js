const { check } = require("express-validator");

exports.linkCreateValidator = [
  check("title").not().isEmpty().withMessage("Title is required!"),
  check("url").not().isEmpty().withMessage("URL is required"),
  check("categories").not().isEmpty().withMessage("Pick a category."),
  check("type")
    .not()
    .isEmpty()
    .withMessage("Choose between free and paid type."),
  check("medium").not().isEmpty().withMessage("Pick a medium video or book."),
];

exports.linkUpdateValidator = [
  check("title").not().isEmpty().withMessage("Title is required!"),
  check("url").not().isEmpty().withMessage("URL is required"),
  check("categories").not().isEmpty().withMessage("Pick a category."),
  check("type")
    .not()
    .isEmpty()
    .withMessage("Choose between free and paid type."),
  check("medium").not().isEmpty().withMessage("Pick a medium video or book."),
];
