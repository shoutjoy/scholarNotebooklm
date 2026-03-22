(function (global) {
  const messages = {
    saveClipping: 'Would you like to send the content you have saved to an external editor for saving and editing?',
    saveScholarSlide: 'Would you like to send the materials you have saved to Scholar Slide to create a presentation?'
  };

  function getConfirmFn() {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm.bind(window);
    }
    if (typeof global.confirm === 'function') {
      return global.confirm.bind(global);
    }
    return function () { return true; };
  }

  function isExternalToMD(url) {
    return typeof url === 'string' && /^https:\/\/mdproviewer\.vercel\.app\/?/i.test(url);
  }

  function isScholarSlide(url) {
    return typeof url === 'string' && /^https:\/\/scholarslide\.vercel\.app\/?/i.test(url);
  }

  function confirmExternalToMD(url) {
    if (!isExternalToMD(url)) return true;
    return getConfirmFn()(messages.saveClipping);
  }

  function confirmScholarSlide(url) {
    if (!isScholarSlide(url)) return true;
    return getConfirmFn()(messages.saveScholarSlide);
  }


  const api = {
    messages,
    isExternalToMD,
    isScholarSlide,
    confirmExternalToMD,
    confirmScholarSlide
  };

  global.ScholarConfirm = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
