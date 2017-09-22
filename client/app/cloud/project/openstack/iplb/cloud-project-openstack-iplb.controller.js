"use strict";

angular.module("managerApp")
  .controller("CloudProjectOpenstackIplbCtrl",
    function (OvhApiCloudProjectIplb, OvhApiIpLoadBalancing,
              $translate, $window, Toast, $scope, $filter, $q, $timeout, CloudProjectOrchestrator, $state,
              $stateParams, Poller) {

    var self = this,
        serviceName = $stateParams.projectId,
        instances = [],
        images = [],
        orderBy = $filter('orderBy');

    //Datas
    self.table = {
        iplb       : [],
        ipLoadbalancing : [],
    };

    self.form = {
        ipLoadbalancing : "",
    }

    self.toggle = {
        iplbDeleteId     : null,   //Curent iplb to delete
    };

    //Loader during Datas requests
    self.loaders = {
        table : {
            iplb : false,
            ipLoadbalancing : false,
        },
        form : {
            ipLoadbalancing : false,
        },
        remove : {
        },
        validate : false,
    };

    function init () {
        var validatePromise;
        var ipLoadbalancingPromise = self.getIpLoadbalancing(true); // set clear cache to true because we need fresh data
        if ($stateParams.validate) {
            self.loaders.validate = true
            validatePromise = OvhApiCloudProjectIplb.Lexi().validate({ serviceName : serviceName, id : $stateParams.validate }, {}).$promise.catch(function (err) {
                Toast.error( [$translate.instant('cpc_iplb_error'), err.data && err.data.message || ''].join(' '));
            }).finally(function () { self.loaders.validate = false; });
            $stateParams.validate = "";
        }
        else {
            validatePromise = Promise.resolve("");
        }
        validatePromise = validatePromise.then(function () {
            return self.getIplb(true); // set clear cache to true because we need fresh data
        });
        $q.all([ipLoadbalancingPromise, validatePromise]).then( function () {
            console.log("all promise terminated ?", self.table.ipLoadbalancing, self.table.iplb);
            self.table.ipLoadbalancing = _.filter(self.table.ipLoadbalancing, function (ip) {
                console.log("filter", ip, !_.find(self.table.iplb, function (iplb) { return iplb.iplb === ip }) )
                return !_.find(self.table.iplb, function (iplb) { return iplb.iplb === ip });
            });
            console.log("all promise terminated ?", self.table.ipLoadbalancing, self.table.iplb);
            if (self.table.ipLoadbalancing.length) {
                self.form.ipLoadbalancing = self.table.ipLoadbalancing[0];
            }
        }).catch(function (err) { console.log(err); });
    }

    //---------IPLB---------

    self.getIplb = function (clearCache) {
        if (!self.loaders.table.iplb) {
            self.table.iplb = [];
            self.toggle.iplbDeleteId = null;
            self.loaders.table.iplb = true;
            if (clearCache){
                OvhApiCloudProjectIplb.Lexi().resetQueryCache();
            }

            return getIplbPromise().then(function (result) {
                self.table.iplb = result;
                return result;
            }).catch(function (err) {
                self.table.iplb = [];
                Toast.error( [$translate.instant('cpc_iplb_error'), err.data && err.data.message || ''].join(' '));
            }).finally(function () {
                self.loaders.table.iplb = false;
            });
        }
    };

    self.getIpLoadbalancing = function (clearCache) {
        if (!self.loaders.table.ipLoadbalancing) {
            self.table.ipLoadbalancing = [];
            self.loaders.table.ipLoadbalancing = true;
            if (clearCache){
                OvhApiIpLoadBalancing.Lexi().resetQueryCache();
            }

            return OvhApiIpLoadBalancing.Lexi().query().$promise.then(function (result) {
                self.table.ipLoadbalancing = result;
                if (result.length) {
                    self.form.ipLoadbalancing = result[0]
                }
                return result;
            }, function (err) {
                self.table.ipLoadbalancing = null;
                Toast.error( [$translate.instant('cpc_iplb_error'), err.data && err.data.message || ''].join(' '));
            })['finally'](function () {
                self.loaders.table.ipLoadbalancing = false;
            });
        }
    };

    self.importIplb = function () {
        if (!self.loaders.form.ipLoadbalancing) {
            self.loaders.form.ipLoadbalancing = true;
            OvhApiCloudProjectIplb.Lexi().post({ serviceName : serviceName }, {ipLoadbalancingServiceName : self.form.ipLoadbalancing }).$promise
            .then(function (result) {
                $window.location.href=result.validationUrl;
            }).catch(function (err) {
                Toast.error( [$translate.instant('cpc_iplb_error'), err.data && err.data.message || ''].join(' '));
            }).finally(function () {
                self.loaders.form.ipLoadbalancing = false;
            });
        }
    }

    function getIplbPromise(){
        return OvhApiCloudProjectIplb.Lexi().query({
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
            }).then(function (e) { console.log("terminate get all iplb", e); return e;});
    }

    self.deleteIplb = function (iplb) {
        if (!self.loaders.remove.iplb) {
            self.loaders.remove.iplb = true;
            var promiseDelete = deleteIplb(iplb.id);
            promiseDelete.then(function () {
                self.getIplb(true);
                Toast.success($translate.instant('cpc_iplb_delete_success'));
            }, function (err) {
                Toast.error( [$translate.instant('cpc_iplb_delete_error'), err.data && err.data.message || ''].join(' '));
            })['finally'](function () {
                self.loaders.remove.iplb = false;
            });
        }
    };

    self.deleteMultiIplb = function () {
        var tabDelete = [],
            nbSelected  = self.getSelectedCount();

        self.loaders.remove.iplbMulti = true;

        angular.forEach(self.table.selected, function (value, iplbId){
            var iplb = _.find(self.table.iplb, {id : iplbId});
            if (iplb) {
                var promiseDelete = iplb.type==="volume" ?
                    deleteVolumeIplb(iplb.id) : deleteIplb(iplb.id);
                tabDelete.push(promiseDelete.then(function(){
                    return null;
                }, function (error){
                    return $q.reject({id : iplbId, error : error.data});
                }));
            }
        });

        $q.allSettled(tabDelete).then(function (){
            if (nbSelected > 1) {
                Toast.success($translate.instant('cpc_iplb_delete_success_plural', {nbIplbs: nbSelected}));
            }else {
                Toast.success($translate.instant('cpc_iplb_delete_success'));
            }
        }, function (error){
            var tabError = error.filter(function (val) {
                return val !== null;
            });
            self.table.autoSelected = _.pluck(tabError, 'id');
            if (tabError.length > 1) {
                Toast.error($translate.instant('cpc_iplb_delete_error_plural', {nbIplbs: tabError.length}));
            } else {
                Toast.error($translate.instant('cpc_iplb_delete_error_one'));
            }
        })['finally'](function(){
            //self.table.selected = {};
            self.getIplb(true);
            self.loaders.remove.iplbMulti = false;
        });
    };

    function deleteIplb (iplbId) {
        return OvhApiCloudProjectIplb.Lexi().remove({
            serviceName : serviceName,
            id: iplbId
        }).$promise;
    }

    init();

  });
