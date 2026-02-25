#!/bin/bash

# Step 1: Obfuscate JS
javascript-obfuscator js/ --output js-obfuscated/

# Step 2: Minify CSS
cleancss -o css/minified.css css/*.css

# Step 3: Minify HTML
html-minifier --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index.min.html index.html

# Step 4: Pack Files
zip -r project.zip index.min.html js-obfuscated/ css/minified.css
