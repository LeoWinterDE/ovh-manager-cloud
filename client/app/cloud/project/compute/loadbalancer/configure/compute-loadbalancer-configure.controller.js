angular.module("managerApp").controller("CloudProjectComputeLoadbalancerConfigureCtrl", function ($anchorScroll, $scope, $stateParams, $q, $location, $window, $translate,  CloudProjectComputeLoadbalancerService, OvhApiIpLoadBalancing, OvhApiCloudProjectIplb, OvhApiCloudProject, ovhDocUrl, CloudMessage, IpLoadBalancerTaskService, ControllerHelper, CloudPoll) {
    var self = this;

    var serviceName = $stateParams.projectId,
        loadbalancerId = $stateParams.loadbalancerId;

    self.loaders = {
        loadbalancer : false,
        table : {
            server : false,
        },
        form : {
            loadbalancer : false,
        }
    };

    // Data
    self.loadbalancer = {};
    self.table = {
        server : [],
    };

    self.form = {
        openstack : false,
        servers : {},
    };

    self.toggle = {
        updatedMessage : false,
    };


    function init () {
        var validatePromise;
        // Terminate validation if params exists
        if ($stateParams.validate) {
            self.loaders.loadbalancer = true
            validatePromise = OvhApiCloudProjectIplb.Lexi().validate({ serviceName : serviceName, id : $stateParams.validate }, {}).$promise
            .then(() => {
                $location.search("validate",null);
                self.toggle.updatedMessage = true;
            })
            .catch(err => Toas.error( [$translate.instant('cpc_loadbalancer_error'), err.data && err.data.message || ''].join(' ')))
            .finally(() => self.loaders.loadbalancer = false);
            $stateParams.validate = "";
        }
        else {
            validatePromise = Promise.resolve("");
        }
        // After validation, load the loadbalancer
        validatePromise.then(() => getLoadbalancer(true));

        // Get loadbalancer pending tasks and define poller
        self.tasks = ControllerHelper.request.getArrayLoader({
            loaderFunction: () => IpLoadBalancerTaskService.getTasks(loadbalancerId).then(tasks => _.filter(tasks, task => _.includes(["todo","doing"], task.status))),
            successHandler: () => startTaskPolling()
        });
        self.tasks.load();

        $scope.$on("$destroy", () => stopTaskPolling());
        initGuides();
    }

    function initGuides() {
        self.guides = {
            horizon: ovhDocUrl.getDocUrl("g1773.creer_un_acces_a_horizon")
        };
    }

    // Get servers of the default default farm of the frontend
    function getAttachedServers() {
        if (!self.loadbalancer.farm) {
            return Promise.resolve([]);
        }
        return OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().query({
             serviceName : loadbalancerId,
             farmId : self.loadbalancer.farm.farmId,
        }).$promise
        .then(serverIds =>
            $q.all(
                 _.map(serverIds, serverId => OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().get({
                         serviceName : loadbalancerId,
                         farmId : self.loadbalancer.farm.farmId,
                         serverId : serverId,
                     }).$promise
                 )
            )
        );
    }

    // Get cloud servers to add in the loadbalancer
    function getServers() {
        if (self.loaders.table.server) {
            return;
        }
        self.loaders.table.server = true;
        return $q.all({
            cloudServers : OvhApiCloudProject.Instance().Lexi().query({ serviceName : serviceName }).$promise,
            attachedServers : getAttachedServers(),
        }).then(({cloudServers, attachedServers}) => {
            self.attachedServers = {};
            _.forEach(attachedServers, (attachedServer) => {
                if(attachedServer.status == "active") {
                    self.attachedServers[attachedServer.address] = attachedServer;
                }
            });
            self.form.servers = _.mapValues(self.attachedServers, (e) => e ? true : false );
            // Generate array of object type as {ipv4, name}
            self.table.server =
                _.flatten(_.map(cloudServers, (server) =>
                    _.map(_.filter(server.ipAddresses, { type : "public", version : 4 }), (adresse) => ({ label : server.name, ip : adresse.ip }))
                ));
         }).catch((err) => {
            self.table.server = null;
            CloudMessage.error( [$translate.instant('cpc_server_error'), err.data && err.data.message || ''].join(' '))
        }).finally(() => self.loaders.table.server = false);
    }

    // Configure and deploy the loadbalancer
    self.configure = function () {
        if (self.loaders.form.loadbalancer) {
            return;
        }
        self.loaders.form.loadbalancer = true;
        var promise = $q.resolve("");

        // Configure the HTTP(80) loadbalancer
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

            // Add or remove servers
            var modified = false;
            _.forEach(self.form.servers, (enable, ip) => {
                const server = _.find(self.table.server, { ip : ip })
                const displayName = server ? server.label : null;
                if (enable && !self.attachedServers[ip]) {
                    modified = true;
                    promise = promise.then(() => OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().post({ serviceName : loadbalancerId, farmId : self.loadbalancer.farm.farmId}, {
                       displayName : displayName,
                       port : 80,
                       address : ip,
                       status : "active",
                   }));
                }
                if (!enable && self.attachedServers[ip]) {
                    modified = true;
                    promise = promise.then(() => OvhApiIpLoadBalancing.Farm().Http().Server().Lexi().delete({
                       serviceName : loadbalancerId,
                       serverId : self.attachedServers[ip].serverId,
                       farmId : self.loadbalancer.farm.farmId,
                   }));
                }
            })

            // Deploy configuration
            if (modified) {
                promise = promise.then(() => OvhApiIpLoadBalancing.Lexi().refresh({ serviceName : loadbalancerId }, {}).$promise);
                promise = promise.then(() => self.tasks.load())
            }
        }
        // Configure the openstack importation
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


    // Tasks poller
    function startTaskPolling () {
       stopTaskPolling();

       self.poller = CloudPoll.pollArray({
           items: self.tasks.data,
           pollFunction: task => IpLoadBalancerTaskService.getTask(loadbalancerId, task.id),
           stopCondition: task => {
               var res =  _.includes(["done", "error"], task.status);
               // Remove terminated tasks
               if (res) {
                   self.tasks.data = _.filter(self.tasks.data, t =>  t.id !== task.id )
               }
           }
       });
    }

    function stopTaskPolling () {
       if (self.poller) {
           self.poller.kill();
       }
    }
    
    init();
});
