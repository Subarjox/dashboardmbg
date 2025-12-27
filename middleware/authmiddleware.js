
function isAuthenticated(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.session.flash = {
    type: 'error',
    message: 'Anda tidak memiliki akses ke halaman ini!'
  };

  return res.redirect('/');
}

function isSekolah(req, res, next) {
  if (req.session.user && req.session.user.role === 'sekolah') {
    return next();
  }
  req.session.flash = {
    type: 'error',
    message: 'Anda tidak memiliki akses ke halaman ini!'
  };

  return res.redirect('/');
}

function isSPPG(req, res, next) {
  if (req.session.user && req.session.user.role === 'sppg') {
    return next();
  }
  req.session.flash = {
    type: 'error',
    message: 'Anda tidak memiliki akses ke halaman ini!'
  };

  return res.redirect('/');
}

module.exports = { isAuthenticated, isSekolah, isSPPG };