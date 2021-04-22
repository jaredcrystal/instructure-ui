/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 - present Instructure, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const path = require('path')
const fs = require('fs')
const loaderUtils = require('loader-utils')

const parsePropValues = require('./parsePropValues')

/**
 * A webpack loader that processes component example files for e.g. Storybook
 * for more see https://webpack.js.org/api/loaders/
 */
module.exports = function componentExamplesLoader(source, map, meta) {
  this.cacheable && this.cacheable()

  const callback = this.async()
  const generateComponentExamples = require.resolve('./generateComponentExamples')

  // TODO do not use this method, its an internal webpack feature. See
  // https://github.com/webpack/loader-utils/issues/42
  // weird string that contains the .examples.js file, e.g.
  // !!/Users/matyas.szabo/CODE/instructure-ui/node_modules/babel-loader/lib/index.js??ref--6-1!/Users/matyas.szabo/CODE/instructure-ui/node_modules/eslint-loader/dist/cjs.js??ref--4!/Users/matyas.szabo/CODE/instructure-ui/packages/ui-tag/src/Tag/__examples__/Tag.examples.js
  const configPath = `!!${loaderUtils.getRemainingRequest(this)}`

  // path to the component that is tested, e.g. /ui-tag/src/Tag/index.js
  const componentPath = path.resolve(path.dirname(this.resourcePath), '../index.js')

  // eslint-disable-next-line no-console
  console.log("CF PATH:", configPath)

  // eslint-disable-next-line no-console
  console.log("comp PATH:", componentPath)

  fs.readFile(
    `${componentPath}${!componentPath.includes('.') ? '.js' : ''}`,
    'utf8',
    (err, componentSrc) => {
      err && this.emitWarning(err)
      let generatedPropValues = {}
      if (!err) {
        this.addDependency(componentPath)
        try {
          generatedPropValues = parsePropValues(componentSrc, componentPath)
        } catch (error) {
          this.emitWarning(error)
        }
      }
      const result = `
const generateComponentExamples = require(${JSON.stringify(generateComponentExamples)})
const config = require(${JSON.stringify(configPath)}).default

// merge in generated prop values:
config.propValues = Object.assign(
  ${JSON.stringify(generatedPropValues)},
  config.propValues || {}
)
const Component = require(${JSON.stringify(componentPath)}).default
config.maxExamples = Boolean(config.maxExamples) ? config.maxExamples : 500

module.exports = {
 componentName: Component.displayName || Component.name,
 sections: generateComponentExamples(Component, config)
}`
      return callback(null, result, map)
    }
  )
}
