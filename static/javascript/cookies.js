function Cookie() { }

Cookie.prototype.setCookie = function(key, value, expire) {
  document.cookie = `${key}=${value};expires=${expire}`;
};

Cookie.prototype.getCookie = function(key) {
  return document.cookie.match(RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
};

Cookie.prototype.deleteCookie = function(key) {
  var expire = new Date();
  document.cookie = `${key}=;expires=${expire.setHours(expire.getHours() - 24)}`;
};

Cookie.prototype.getExpiration = function(expire) {
  var expire = new Date();

  switch (expire) {
    case this.expire.DAY:
      expire.setHours(expire.getHours() + 24);
      break;
    case this.expire.MONTH:
      expire.setMonth(expire.getMonth() + 1);
      break;
    case this.expire.YEAR:
      expire.setFullYear(expire.getFullYear() + 1);
      break;
    default:
      throw new Exception(`Data type ${expire} is not contained in Enum.Expire: ${this.Enum.Expire}`);
  }

  return expire;
}

Cookie.prototype.Enum = { Expire: { DAY: "DAY", MONTH: "MONTH", YEAR: "YEAR" } };
