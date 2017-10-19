"use strict";

angular.module("managerApp")
  .controller("CloudProjectComputeLoadbalancerCtrl", function ($q, $scope, $translate, CloudProjectComputeLoadbalancerService, OvhApiCloudProjectIplb, OvhApiIpLoadBalancing, ControllerHelper, CloudMessage, $stateParams) {

    var self = this,
        serviceName = $stateParams.projectId;

    //Datas
    self.table = {
        loadbalancer : [],
        loadbalancerFilter: []
    };

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

    var unsubscribeSearchEvent;

    //loadbalancer model to add
    function initNewLoadbalancer () {
        self.loadbalancerAdd = {
            serviceName : serviceName,
            name : null,
            publicKey  : null
        };
    }

    function init () {
        self.getLoadbalancers();

        initNewLoadbalancer();

    }


    function filterLoadbalancers () {
        if (self.table.loadbalancer.length){
            self.orderBy();
        }
    }

    //---------TOOLS---------

    self.toggleAddLoadbalancer = function () {
        if (self.toggle.openAddLoadbalancer) {
            initNewLoadbalancer();
        }
        self.toggle.openAddLoadbalancer = !self.toggle.openAddLoadbalancer;
    };

    //---------ORDER---------

    self.orderBy = function (by) {
        if (by) {
            if (self.order.by === by) {
                self.order.reverse = !self.order.reverse;
            } else {
                self.order.by = by;
            }
        }
    };

    self.selectLoadbalancer = function(id, active){
        if (active) {
            setTimeout(function(){
                var areaheight=$('#loadbalancerkey_'+ id).prop('scrollHeight');
                $('#loadbalancerkey_'+ id).height(areaheight).select();
            }, 0);
        }
    };

    //---------SSH---------

    self.getLoadbalancers = function (clearCache) {
        if (!self.loaders.table.loadbalancer) {
            self.loaders.table.loadbalancer = true;
            if (clearCache) {
                OvhApiCloudProjectIplb.Lexi().resetQueryCache();
                OvhApiIpLoadBalancing.Lexi().resetQueryCache();
            }
            $q.all([
                OvhApiIpLoadBalancing.Lexi().query().$promise.then(function (response) {
                    return $q.all(
                        _.map(response, CloudProjectComputeLoadbalancerService.getLoadbalancer)
                    );
                }),
                OvhApiCloudProjectIplb.Lexi().query({
                    serviceName : serviceName
                }).$promise.then(function (response) {
                    return $q.all(
                        _.map(response, function (id) {
                            return OvhApiCloudProjectIplb.Lexi().get({
                                    serviceName : serviceName,
                                    id : id,
                                }).$promise;
                        })
                    );
                }),
            ]).then(function (loadbalancers) {
                // Set openstack status
                var loadBalancerImported = {}
                _.forEach(loadbalancers[1], function(lb) { loadBalancerImported[lb.iplb] = lb });
                self.table.loadbalancer = _.map(loadbalancers[0], function (lb) {
                    if (loadBalancerImported[lb.serviceName]) {
                        lb.openstack = loadBalancerImported[lb.serviceName].status;
                    } else {
                        lb.openstack = "not_imported";
                    }
                    return lb;
                });
                // Set cloud status
                self.table.loadbalancer = _.map(self.table.loadbalancer, function (lb) {
                    if (lb.frontend && lb.farm) {
                        lb.status = "deployed";
                    } else if (!lb.frontend && !lb.farm){
                        lb.status = "available";
                    } else {
                        lb.status = "custom";
                    }
                    return lb;
                });
                filterLoadbalancers();
            }).catch(function (err){
                self.table.loadbalancer = null;
                CloudMessage.error( [$translate.instant('cpc_loadbalancer_error'), err.data && err.data.message || ''].join(' '));
            })['finally'](function () {
                self.loaders.table.loadbalancer = false;
            });
        }
    };

    self.postLoadbalancer = function () {
        if (!self.loaders.add.loadbalancer) {
            var uniq = _.find(self.table.loadbalancer, function (loadbalancerkey) {
                return loadbalancerkey.name === self.loadbalancerAdd.name;
            });

            if (uniq) {
                CloudMessage.error( $translate.instant('cpc_loadbalancer_add_submit_name_error'));
                return;
            }

            self.loaders.add.loadbalancer = true;
            OvhApiCloudProjectIplb.Lexi().save(self.loadbalancerAdd).$promise.then(function () {
                self.toggleAddLoadbalancer();
                self.getLoadbalancers(true);
                CloudMessage.success($translate.instant('cpc_loadbalancer_add_submit_success'));
            }, function (err){
                CloudMessage.error( [$translate.instant('cpc_loadbalancer_add_submit_error'), err.data && err.data.message || ''].join(' '));
            })['finally'](function () {
                self.loaders.add.loadbalancer = false;
            });
        }
    };

    self.openDeleteLoadbalancer = function (loadbalancer) {
        ControllerHelper.modal.showModal({
            modalConfig: {
                templateUrl: "app/cloud/project/compute/loadbalancer/delete/compute-loadbalancer-delete.html",
                controller: "CloudProjectComputeLoadbalancerDeleteCtrl",
                controllerAs: "$ctrl",
                resolve: {
                    serviceName: () => serviceName,
                    loadbalancer: () => loadbalancer
                }
            },
            successHandler: () => {
                self.getLoadbalancers(true);
                CloudMessage.success($translate.instant('cpc_loadbalancer_delete_success'));
            },
            errorHandler: (err) => CloudMessage.error( [$translate.instant('cpc_loadbalancer_delete_error'), err.data && err.data.message || ''].join(' '))
        });
    };

    init();

});
