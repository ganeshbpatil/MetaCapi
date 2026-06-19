const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

function ejsRenderer(viewsDir) {
  const LAYOUT = fs.readFileSync(path.join(viewsDir, 'layout.ejs'), 'utf8');

  return function (req, res, next) {
    // res.renderPage wraps the view in layout.ejs
    res.renderPage = function (view, locals = {}) {
      const data = {
        admin: req.session?.admin || null,
        pageTitle: '',
        flash: null,
        ...locals,
      };
      ejs.renderFile(path.join(viewsDir, view + '.ejs'), data, {}, (err, content) => {
        if (err) return next(err);
        const html = ejs.render(LAYOUT, { ...data, content }, { filename: path.join(viewsDir, 'layout.ejs') });
        res.send(html);
      });
    };

    // res.render for standalone pages (login) — no layout wrapper
    res.render = function (view, locals = {}) {
      ejs.renderFile(path.join(viewsDir, view + '.ejs'), locals, {}, (err, html) => {
        if (err) return next(err);
        res.send(html);
      });
    };

    next();
  };
}

module.exports = { ejsRenderer };
