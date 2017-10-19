angular.module("managerApp").controller("CloudProjectComputeLoadbalancerConfigureCtrl", function ($anchorScroll, $stateParams, $q, $location, $window, $translate,  CloudProjectComputeLoadbalancerService, OvhApiIpLoadBalancing, OvhApiCloudProjectIplb, OvhApiCloudProject, ovhDocUrl, CloudMessage) {
    var self = this;

    var serviceName = $stateParams.projectId;

    var loadbalancerId = $stateParams.loadbalancerId;

    self.loaders = {
        loadbalancer : false,
        table : {
            server : false,
        },
        form : {
            loadbalancer : false,
        }
    };

    self.loadbalancer = {};

    self.form = {
        openstack : false,
        servers : {},
    };

    self.toggle = {
        updatedMessage : false,
    };

    self.table = {
        server : [],
    };

    function init () {
        var validatePromise;
        console.log("validating ?", $stateParams.validate);
        if ($stateParams.validate) {
            self.loaders.loadbalancer = true
            validatePromise = OvhApiCloudProjectIplb.Lexi().validate({ serviceName : serviceName, id : $stateParams.validate }, {}).$promise
            .then(function () {
                $location.search("validate",null);
                self.toggle.updatedMessage = true;
            })
            .catch(function (err) {
                console.log("error", err);
                Toast.error( [$translate.instant('cpc_loadbalancer_error'), err.data && err.data.message || ''].join(' '));
            }).finally(function () { self.loaders.loadbalancer = false; });
            $stateParams.validate = "";
        }
        else {
            validatePromise = Promise.resolve("");
        }
        validatePromise.then(() => getLoadbalancer(true));
        initGuides();
    }

    function initGuides() {
        self.guides = {
            horizon: ovhDocUrl.getDocUrl("g1773.creer_un_acces_a_horizon")
        };
    }

    function getAttachedServers() {
        console.log("getAttachedServers",self.loadbalancer)
        if (!self.loadbalancer.farm) {
            return Promise.resolve([]);
        }
        console.log("get servers");
        return OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().query({
         serviceName : loadbalancerId,
         farmId : self.loadbalancer.farm.farmId,
        }).$promise.then(function (servers) {
         console.log("servers", servers);
             return $q.all(
                 _.map(servers, function (serverId) {
                     return OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().get({
                         serviceName : loadbalancerId,
                         farmId : self.loadbalancer.farm.farmId,
                         serverId : serverId,
                     }).$promise;
                 })
             ).then((servers) => {
                 console.log("servers", servers);
                 return servers;
             })
        });
    }

    function getServers() {
        console.log("get servers");
        if (self.loaders.table.server) {
            return;
        }
        self.loaders.table.server = true;
        return $q.all([
            // Get cloud servers
            OvhApiCloudProject.Instance().Lexi().query({ serviceName : serviceName }).$promise,
            // Get attached servers
            getAttachedServers(),
        ]).then((result) => {
            var servers = result[0];
            self.attachedServers = {};
            _.forEach(result[1], (attachedServer) => {
                if(attachedServer.status == "active") {
                    self.attachedServers[attachedServer.address] = attachedServer;
                }
            });
            self.form.servers = _.mapValues(self.attachedServers, (e) => e ? true : false );
            self.table.server =
                _.flatten(_.map(servers, (server) =>
                    _.map(_.filter(server.ipAddresses, { type : "public", version : 4 }), (adresse) => {
                        return { label : server.name, ip : adresse.ip };
                    })
                ));
         }).catch((err) => {
            self.table.server = null;
            console.log("error", err)
            CloudMessage.error( [$translate.instant('cpc_server_error'), err.data && err.data.message || ''].join(' '))
        }).finally(() => self.loaders.table.server = false);
    }

    self.configure = function () {
        if (self.loaders.form.loadbalancer) {
            return;
        }
        self.loaders.form.loadbalancer = true;
        console.log("sending form",self.loadBalancerImported, self.loadbalancer);
        var promise = $q.resolve("");
        if (self.loadbalancer.status !== "custom") {
            if(self.loadbalancer.status === "available") {
                // Create farm and front
                promise = promise.then(() => OvhApiIpLoadBalancing.Farm().Http().Lexi().post({ serviceName : loadbalancerId}, {
                   displayName : `PublicCloud-${serviceName}`,
                   port : 80,
                   zone : "all",
                }).then((farm) => self.loadbalancer.farm = farm));
                promise = promise.then(() => OvhApiIpLoadBalancing.Front().Http().Lexi().post({ serviceName : loadbalancerId}, {
                   displayName : `PublicCloud-${serviceName}`,
                   port : 80,
                   zone : "all",
                   defaultFarmId : self.loadbalancer.farm.farmId,
               }).then((frontend) => self.loadbalancer.frontend = frontend));
            }

            // Add servers
            _.forEach(self.form.servers, (enable, ip) => {
                const server = _.find(self.table.server, { ip : ip })
                const displayName = server ? server.label : null;
                if (enable && !self.attachedServers[ip]) {
                    promise = promise.then(() => OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().post({ serviceName : loadbalancerId, farmId : self.loadbalancer.farm.farmId}, {
                       displayName : displayName,
                       port : 80,
                       address : ip,
                       status : "active",
                   }));
                }
                if (!enable && self.attachedServers[ip]) {
                    promise = promise.then(() => OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().delete({
                       serviceName : loadbalancerId,
                       serverId : self.attachedServers[ip].serverId,
                       farmId : self.loadbalancer.farm.farmId,
                   }));
                }
            })
        }
        if (self.form.openstack && (!self.loadBalancerImported || self.loadBalancerImported.status !== "validated")) {
            // Need to remove old import to recreate it
            if (self.loadBalancerImported) {
                promise = promise.then(() => OvhApiCloudProjectIplb.Lexi().delete({ serviceName : serviceName, id : self.loadBalancerImported.id }).$promise);
            }
            promise = promise.then(() => {
                // Import and redirect to auth page
                return OvhApiCloudProjectIplb.Lexi().post({ serviceName : serviceName }, {ipLoadbalancingServiceName : loadbalancerId, redirection : $location.absUrl().replace(/\?.*$/,"") + "?validate=%id" }).$promise
                .then(function (result) {
                    $window.location.href=result.validationUrl;
                    self.loaders.form.redirect = true;
                })
            });
        } else if (!self.form.openstack && self.loadBalancerImported) {
            promise = promise.then(()=>OvhApiCloudProjectIplb.Lexi().delete({ serviceName : serviceName, id : self.loadBalancerImported.id }).$promise).then(() => {
                self.loadBalancerImported = null;
                self.form.openstack = false;
            });
        }
        return promise.then(() => {
            self.toggle.updatedMessage = true;
            $location.hash("compute-loadbalancer-configure");
            $anchorScroll();
        }).catch(function (err) {
            Toast.error( [$translate.instant('cpc_loadbalancer_error'), err.data && err.data.message || ''].join(' '));
        }).finally(() => self.loaders.form.loadbalancer = false);
    };

    function getLoadbalancer(clearCache) {
        if (!self.loaders.loadbalancer) {
            self.loaders.loadbalancer = true;
            if (clearCache) {
                OvhApiCloudProjectIplb.Lexi().resetQueryCache();
                OvhApiIpLoadBalancing.Lexi().resetQueryCache();
            }
            return $q.all([
                CloudProjectComputeLoadbalancerService.getLoadbalancer(loadbalancerId),
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
                console.log("found loadbalancer", loadbalancers);
                // Set openstack status
                self.loadbalancer = loadbalancers[0];
                if (self.loadbalancer.frontend && self.loadbalancer.farm) {
                    self.loadbalancer.status = "deployed";
                } else if (!self.loadbalancer.frontend && !self.loadbalancer.farm){
                    self.loadbalancer.status = "available";
                } else {
                    self.loadbalancer.status = "custom";
                }

                self.loadBalancerImported = _.find(loadbalancers[1], { iplb : loadbalancerId});
                if (!self.loadBalancerImported) {
                    return;
                }
                if (self.loadBalancerImported.status === "validated") {
                    self.form.openstack = true;
                }
                console.log("terminated1");
            }).then(function () {
                console.log("terminated");
                return getServers();
            })
            .catch(function (err){
                self.loadbalancer = null;
                console.log("error", err);
                CloudMessage.error( [$translate.instant('cpc_loadbalancer_error'), err.data && err.data.message || ''].join(' '));
            })['finally'](function () {
                self.loaders.loadbalancer = false;
            });
        }
    }
    init();
});
