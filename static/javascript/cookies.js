function Cookie() { }

Cookie.prototype.set = function(key, value, expire) {
  document.cookie = `${key}=${value};expires=${expire}`;
};

Cookie.prototype.get = function(key) {
  var value = document.cookie.match(RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
  return value && value.length > 1 ? value[1] : undefined;
};

Cookie.prototype.delete = function(key) {
  var expire = new Date();
  document.cookie = `${key}=;expires=${expire.setHours(expire.getHours() - 24)}`;
};

Cookie.prototype.getExpiration = function(type) {
  var expire = new Date();

  switch (type) {
    case this.Enums.EXPIRES.DAY:
      expire.setHours(expire.getHours() + 24);
      break;
    case this.Enums.EXPIRES.MONTH:
      expire.setMonth(expire.getMonth() + 1);
      break;
    case this.Enums.EXPIRES.YEAR:
      expire.setFullYear(expire.getFullYear() + 1);
      break;
    default:
      throw new Error(`Data type ${expire} is not contained in Enum.Expires: ${JSON.stringify(Object.keys(this.Enums.EXPIRES))}`);
  }

  return expire;
}

Cookie.prototype.Enums = { EXPIRES: { DAY: "DAY", MONTH: "MONTH", YEAR: "YEAR" } };
