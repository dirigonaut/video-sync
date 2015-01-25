function base_rule(){};

base_rule.prototype.process_rule = function(socket, data){
	var candidates = this.get_candidates(socket);
    var vetted_candidates = this.check_conditions(socket, data, candidates);
    this.generate_commands(data, vetted_candidates);
};

base_rule.prototype.get_candidates = function(socket){};

base_rules.prototype.check_conditions = function(socket, data, candidates){};

base_rules.prototype.generate_commands = function(data, candidates){};

module.exports = base_rule;
