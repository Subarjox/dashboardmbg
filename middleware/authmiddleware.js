
function isAuthenticated(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
      next();
    } else {
      res.redirect('/');
    }
  }

function isSekolah(req, res, next) {
    if (req.session.user && req.session.user.role === 'sekolah') {
      next();
    } else {
      res.redirect('/');
    }
  }

function isSPPG(req, res, next) {
    if (req.session.user && req.session.user.role === 'sppg') {
      next();
    } else {
      res.redirect('/');
    }
  }
  
  module.exports = { isAuthenticated, isSekolah, isSPPG };