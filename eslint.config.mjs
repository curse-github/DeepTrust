// @ts-check

import stylisticJs from "@stylistic/eslint-plugin-js";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import stylisticPlus from "@stylistic/eslint-plugin-plus";
import parserTs from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
export default tseslint.config(
    {
        plugins: {
            "@stylistic/js": stylisticJs,
            "@stylistic/ts": stylisticTs,
            "@stylistic/plus": stylisticPlus
        },
        languageOptions: {
            parser: parserTs
        },
        rules: { /* // https://eslint.style/rules
            "@stylistic/ts/":["error"],*/
            "@stylistic/js/array-bracket-newline": [ "error", "consistent" ],
            "@stylistic/js/array-bracket-spacing": [ "error", "always", { singleValue: true, objectsInArrays: true, arraysInArrays: true } ],
            // "@stylistic/js/array-element-newline":[ "error", "consistent", {} ], // dont want this one
            // "@stylistic/js/arrow-parens":[ "error", "always" ], // kind of enforced by typescript anyways
            "@stylistic/js/arrow-spacing": [ "error", { before: true, after: true } ],
            "@stylistic/js/block-spacing": [ "error", "always" ],
            "@stylistic/ts/brace-style": [ "error", "1tbs", { allowSingleLine: true } ],
            "@stylistic/ts/comma-dangle": [ "error", "never" ],
            "@stylistic/ts/comma-spacing": [ "error", { before: false, after: true } ],
            "@stylistic/js/comma-style": [ "error", "last" ],
            "@stylistic/js/computed-property-spacing": [ "error", "never", { enforceForClassMembers: true } ],
            "@stylistic/plus/curly-newline": [ "error", { consistent: true } ],
            "@stylistic/js/dot-location": [ "error", "property" ],
            // "@stylistic/js/eol-last":["error", "never" ], // dont want this one
            "@stylistic/ts/function-call-spacing": [ "error", "never" ],
            "@stylistic/js/function-paren-newline": [ "error", "consistent" ],
            "@stylistic/js/implicit-arrow-linebreak": [ "error", "beside" ],
            "@stylistic/ts/indent": [ "error", 4 ],
            "@stylistic/plus/indent-binary-ops": [ "error", 4 ],
            "@stylistic/ts/key-spacing": [ "error", { beforeColon: false, afterColon: true, mode: "strict" } ],
            "@stylistic/ts/keyword-spacing": [ "error", { before: true, after: true } ],
            // "@stylistic/js/line-comment-position": [ "error", "beside" ], // dont want this one
            "@stylistic/js/linebreak-style": [ "error", "unix" ],
            // "@stylistic/ts/lines-around-comment": [ "error", {} ], // dont want this one
            // "@stylistic/ts/lines-between-class-members": [ "error", {} ], // dont really understand this one
            // "@stylistic/js/max-len": [ "error", {} ], // dont want this one
            "@stylistic/js/max-statements-per-line": [ "error", { max: 3 } ],
            "@stylistic/ts/member-delimiter-style": [ "error", { multiline: { delimiter: "comma", requireLast: false }, singleline: { delimiter: "comma", requireLast: false } } ],
            // "@stylistic/ts/multiline-comment-style": [ "error", "starred-block" ], // dont want this one
            "@stylistic/js/multiline-ternary": [ "error", "never" ],
            "@stylistic/js/new-parens": [ "error", "always" ],
            "@stylistic/js/newline-per-chained-call": [ "error", { ignoreChainWithDepth: 4 } ], // 4 is a little too excessive
            "@stylistic/js/no-confusing-arrow": [ "error", { allowParens: true } ],
            // "@stylistic/js/no-extra-parens": [ "error", "all" ], // dont want this one
            "@stylistic/js/no-extra-semi": [ "error" ],
            "@stylistic/js/no-floating-decimal": [ "error" ],
            "@stylistic/js/no-mixed-operators": [ "error" ],
            "@stylistic/js/no-mixed-spaces-and-tabs": [ "error" ],
            "@stylistic/js/no-multi-spaces": [ "error", { ignoreEOLComments: true } ],
            // "@stylistic/js/no-multiple-empty-lines": [ "error" ], // dont want this one
            "@stylistic/js/no-tabs": [ "error" ],
            "@stylistic/js/no-trailing-spaces": [ "error", { skipBlankLines: true, ignoreComments: true } ],
            "@stylistic/js/no-whitespace-before-property": [ "error" ],
            "@stylistic/js/nonblock-statement-body-position": [ "error", "any" ], // not sure what the purpose of "any" is but whatever lol
            "@stylistic/js/object-curly-newline": [ "error", { consistent: true } ],
            "@stylistic/js/object-curly-spacing": [ "error", "always" ],
            // "@stylistic/js/object-property-newline": [ "error", { allowAllPropertiesOnSameLine: true } ], // dont want this one
            // "@stylistic/js/one-var-declaration-per-line": [ "error", "always" ], // dont want this one
            "@stylistic/js/operator-linebreak": [ "error", "none", { overrides: { "||": "before" } } ],
            // "@stylistic/js/padded-blocks": [ "error", "never" ], // dont want this one
            // "@stylistic/js/padding-line-between-statements": [ "error", {} ], // dont want this one
            "@stylistic/js/quote-props": [ "error", "as-needed" ],
            "@stylistic/js/quotes": [ "error", "double" ],
            "@stylistic/js/rest-spread-spacing": [ "error", "never" ],
            "@stylistic/ts/semi": [ "error" ],
            "@stylistic/js/semi-spacing": [ "error", { before: false, after: true } ],
            "@stylistic/js/semi-style": [ "error", "last" ],
            "@stylistic/js/space-before-blocks": [ "error", "always" ],
            "@stylistic/js/space-before-function-paren": [ "error", { anonymous: "never", named: "never", asyncArrow: "always" } ],
            "@stylistic/js/space-in-parens": [ "error", "never" ],
            "@stylistic/js/space-infix-ops": [ "error" ],
            "@stylistic/js/space-unary-ops": [ "error", { words: true, nonwords: false } ],
            "@stylistic/js/spaced-comment": [ "error", "always", { exceptions: [ "-", "=" ], markers: [ " *" ] } ], // not completely sure if I want this or not
            "@stylistic/js/switch-colon-spacing": [ "error", { before: false, after: true } ],
            // "@stylistic/js/template-curly-spacing": [ "error" ], // dont want this one
            // "@stylistic/js/template-tag-spacing": [ "error" ], // dont want this one
            "@stylistic/ts/type-annotation-spacing": [ "error", { before: false, after: true } ],
            "@stylistic/plus/type-generic-spacing": [ "error" ],
            "@stylistic/plus/type-named-tuple-spacing": [ "error" ],
            "@stylistic/js/wrap-iife": [ "error", "inside" ],
            "@stylistic/js/wrap-regex": [ "error" ]
        },
        files: [
            "**/*.ts",
            "webpage/*.js"
        ]
    }
);