"use strict";

angular.module("managerApp")
  .service("CloudProjectComputeLoadbalancerService", function ($q, OvhApiCloudProjectIplb, OvhApiIpLoadBalancing) {
    "use strict";

    var self = this;

    self.getLoadbalancer = function (id) {
        // Get loadbalancer
        return OvhApiIpLoadBalancing.Lexi().get({
            serviceName : id,
        }).$promise.then(function (loadbalancer) {
            // Find the frontend http 80 if exists
            return OvhApiIpLoadBalancing.Frontend().Http().Lexi().query({
                serviceName : id,
                port : 80,
            }).$promise.then(function (frontendIds) {
                // Get frontend details
                return frontendIds.length && OvhApiIpLoadBalancing.Frontend().Http().Lexi().get({
                    serviceName : id,
                    frontendId : frontendIds[0],
                }).$promise || loadbalancer;
            }).then(function (frontend) {
                if (frontend) {
                    loadbalancer.frontend = frontend;
                }
                // Get default farm details
                return frontend && frontend.defaultFarmId && OvhApiIpLoadBalancing.Farm().Http().Lexi().get({
                    serviceName : id,
                    farmId : frontend.defaultFarmId,
                }).$promise || loadbalancer;
            }).then(function (farm) {
                if (farm.farmId) {
                    loadbalancer.farm = farm;
                }
                return loadbalancer;
            });
        });
    }
});
