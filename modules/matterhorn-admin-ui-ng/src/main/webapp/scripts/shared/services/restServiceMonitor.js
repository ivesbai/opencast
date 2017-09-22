angular.module('adminNg.services')
.factory('RestServiceMonitor', ['$http', function($http) {
    var Monitoring = {};
    var services = {
        service: {},
        error: false,
        numErr: 0
    };

    var AMQ_NAME = "ActiveMQ";
    var STATES_NAME = "Service States";
    var BACKEND_NAME = "Backend Services";
    var MALFORMED_DATA = "Malformed Data";
    var OK = "OK";
    var SERVICES_FRAGMENT = "/systems/services?storage={'pagination':{'events':{'limit':10,'offset':0},'services':{'limit':10,'offset':0}},'sorter':{'services':{'status':{'name':'status','priority':0,'order':'DESC'}}}}";

    Monitoring.run = function() {
      //Clear existing data
      services.service = {};
      services.error = false;
      services.numErr = 0;

      Monitoring.getActiveMQStats();
      Monitoring.getBasicServiceStats();
    };

    Monitoring.getActiveMQStats = function() {
      $http.get('/broker/status')
           .then(function(data) {
             Monitoring.populateServiceWithLink(AMQ_NAME, "");
             if (data.status === 204) {
               services.service[AMQ_NAME].status = OK;
               services.service[AMQ_NAME].error = false;
             } else {
               services.service[AMQ_NAME].status = data.statusText;
               services.service[AMQ_NAME].error = true;
             }
           }, function(err) {
             Monitoring.populateServiceWithLink(AMQ_NAME, "");
             services.service[AMQ_NAME].status = err.statusText;
             services.service[AMQ_NAME].error = true;
             services.error = true;
             services.numErr++;
           });
    };

    Monitoring.setError = function(service, text) {
        Monitoring.populateService(service);
        services.service[service].status = text;
        services.service[service].error = true;
        services.error = true;
        services.numErr++;
    };

    Monitoring.getBasicServiceStats = function() {
      $http.get('/services/health.json')
           .then(function(data) {
             if (undefined === data.data || undefined === data.data.health) {
               Monitoring.setError(STATES_NAME, MALFORMED_DATA);
               return;
             }
             var abnormal = 0;
             abnormal = data.data.health['warning'] + data.data.health['error'];
             if (abnormal == 0) {
               Monitoring.populateService(BACKEND_NAME);
               services.service[BACKEND_NAME].status = OK;
             } else {
               Monitoring.getDetailedServiceStats();
             }
           }, function(err) {
             Monitoring.setError(STATES_NAME, err.statusText);
           });
    };

    Monitoring.getDetailedServiceStats = function() {
      $http.get('/services/services.json')
           .then(function(data) {
             if (undefined === data.data || undefined === data.data.services) {
               Monitoring.setError(BACKEND_NAME, MALFORMED_DATA);
               return;
             }
             angular.forEach(data.data.services.service, function(service, key) {
               name = service.type.split('opencastproject.')[1];
               if (service.service_state != "NORMAL") {
                 Monitoring.populateService(name);
                 services.service[name].status = service.service_state;
                 services.service[name].error = true;
                 services.error = true;
                 services.numErr++;
               }
             });
           }, function(err) {
             Monitoring.setError(BACKEND_NAME, err.statusText);
           });
    };

    Monitoring.populateService = function(name) {
        Monitoring.populateServiceWithLink(name, SERVICES_FRAGMENT);
    }

    Monitoring.populateServiceWithLink = function(name, link) {
        if (services.service[name] === undefined) {
            services.service[name] = {link: link};
        }
    };

    Monitoring.getServiceStatus = function() {
        return services;
    };

    return Monitoring;
}]);