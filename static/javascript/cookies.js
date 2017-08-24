function Cookie() { }

Cookie.prototype.setCookie = function(key, value, expire) {
  document.cookie = `${key}=${value};expires=${expire}`;
};

Cookie.prototype.getCookie = function(key) {
  return document.cookie.match(RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
};

Cookie.prototype.getExpiration = function(expireEnum) {
  var expire = new Date();

  switch (expireEnum) {
    case this.ExpireEnum.DAY:
      expire.setHours(expire.getHours() + 24);
      break;
    case this.ExpireEnum.MONTH:
      expire.setMonth(expire.getMonth() + 1);
      break;
    case this.ExpireEnum.YEAR:
      expire.setFullYear(expire.getFullYear() + 1);
      break;
    default:
      throw new Exception(`Data type ${expireEnum} is not containes in ExpireEnum: ${this.ExpireEnum}`);
  }

  return expire;
}

Cookie.prototype.ExpireEnum = { DAY: "DAY", MONTH: "MONTH", YEAR: "YEAR" };
