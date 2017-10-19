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
                if (frontend.frontendId) {
                    loadbalancer.frontend = frontend;
                }
                // Get default farm details
                return frontend.frontendId && frontend.defaultFarmId && OvhApiIpLoadBalancing.Farm().Http().Lexi().get({
                    serviceName : id,
                    farmId : frontend.defaultFarmId,
                }).$promise || loadbalancer;
            }).then(function (farm) {
                if (farm.farmId) {
                    loadbalancer.farm = farm;
                }
                return loadbalancer;
            });
        }).then(loadbalancer => {
            if (loadbalancer.frontend && loadbalancer.farm) {
                loadbalancer.status = "deployed";
            } else if (!loadbalancer.frontend && !loadbalancer.farm){
                loadbalancer.status = "available";
            } else {
                loadbalancer.status = "custom";
            }
            console.log("loadbalancer ? ", loadbalancer);
            return loadbalancer;
        });
    }

    self.getLoadbalancersImported = function (serviceName) {
        return OvhApiCloudProjectIplb.Lexi().query({
            serviceName : serviceName
        }).$promise.then(ids => $q.all(
                _.map(ids, id =>
                    OvhApiCloudProjectIplb.Lexi().get({
                        serviceName : serviceName,
                        id : id,
                    }).$promise
                )
            )
        ).then(loadbalancers => {
            var result = {};
            _.forEach(loadbalancers, lb => {
                result[lb.iplb] = lb;
            });
            return result;
        })
    }
});
