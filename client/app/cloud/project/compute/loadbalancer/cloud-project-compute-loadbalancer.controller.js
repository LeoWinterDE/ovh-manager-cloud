"use strict";

angular.module("managerApp")
  .controller("CloudProjectComputeLoadbalancerCtrl", function ($q, $scope, $translate, CloudProjectComputeLoadbalancerService, OvhApiCloudProjectIplb, OvhApiIpLoadBalancing, ControllerHelper, CloudMessage, $stateParams, OvhApiMe, URLS) {

    var self = this,
        serviceName = $stateParams.projectId;

    //Datas
    self.table = {
        loadbalancer : [],
    };

    // Order link
    self.urls = URLS;
    self.locale = "";

    self.order = {
        by      : 'serviceName',
        reverse : false
    };

    //Loader during Datas requests
    self.loaders = {
        table : {
            loadbalancer : false
        },
    };

    function init () {
        self.getLoadbalancers(true);
        // Init locale for order link
        OvhApiMe.Lexi().get().$promise.then((user) => self.locale = user.ovhSubsidiary.toUpperCase());

    }


    self.orderBy = function (by) {
        if (by) {
            if (self.order.by === by) {
                self.order.reverse = !self.order.reverse;
            } else {
                self.order.by = by;
            }
        }
    };


    self.getLoadbalancers = function (clearCache) {
        if (!self.loaders.table.loadbalancer) {
            self.loaders.table.loadbalancer = true;
            if (clearCache) {
                OvhApiCloudProjectIplb.Lexi().resetQueryCache();
                OvhApiIpLoadBalancing.Lexi().resetQueryCache();
            }
            $q.all({
                loadbalancers :
                    OvhApiIpLoadBalancing.Lexi().query().$promise.then((response) => $q.all(
                        _.map(response, CloudProjectComputeLoadbalancerService.getLoadbalancer)
                    )),
                laodbalancersImportedArray :
                    OvhApiCloudProjectIplb.Lexi().query({
                        serviceName : serviceName
                    }).$promise.then(ids => $q.all(
                            _.map(ids, id =>
                                OvhApiCloudProjectIplb.Lexi().get({
                                    serviceName : serviceName,
                                    id : id,
                                }).$promise
                            )
                        )
                    )
            }).then(({loadbalancers, laodbalancersImportedArray}) => {
                // Create a map of imported loadbalancers
                var loadBalancerImported = {}
                _.forEach(laodbalancersImportedArray, function(lb) { loadBalancerImported[lb.iplb] = lb });

                // Set openstack importation status
                self.table.loadbalancer = _.map(loadbalancers, function (lb) {
                    if (loadBalancerImported[lb.serviceName]) {
                        lb.openstack = loadBalancerImported[lb.serviceName].status;
                    } else {
                        lb.openstack = "not_imported";
                    }
                    return lb;
                });

                self.orderBy();
            }).catch( err => {
                self.table.loadbalancer = null;
                CloudMessage.error( [$translate.instant('cpc_loadbalancer_error'), err.data && err.data.message || ''].join(' '));
            }).finally(() => self.loaders.table.loadbalancer = false);
        }
    };

    init();

});
