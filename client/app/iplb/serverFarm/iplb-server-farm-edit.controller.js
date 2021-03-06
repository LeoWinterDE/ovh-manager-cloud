class IpLoadBalancerServerFarmEditCtrl {
    constructor ($q, $state, $stateParams, CloudMessage, ControllerHelper,
                 IpLoadBalancerConstant, IpLoadBalancerServerFarmService,
                 IpLoadBalancerZoneService) {
        this.$q = $q;
        this.$state = $state;
        this.$stateParams = $stateParams;
        this.CloudMessage = CloudMessage;
        this.ControllerHelper = ControllerHelper;
        this.IpLoadBalancerConstant = IpLoadBalancerConstant;
        this.IpLoadBalancerServerFarmService = IpLoadBalancerServerFarmService;
        this.IpLoadBalancerZoneService = IpLoadBalancerZoneService;

        this.initLoaders();
    }

    initLoaders () {
        this.zones = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.IpLoadBalancerZoneService.getZonesSelectData(
                this.$stateParams.serviceName
            )
        });

        this.apiFarm = this.ControllerHelper.request.getHashLoader({
            loaderFunction: () => this.IpLoadBalancerServerFarmService.getAllFarmsTypes(
                this.$stateParams.serviceName
            )
                .then(farms => {
                    const farm = _.find(farms, {
                        id: parseInt(this.$stateParams.farmId, 10)
                    });
                    return this.IpLoadBalancerServerFarmService.getServerFarm(
                        this.$stateParams.serviceName,
                        this.$stateParams.farmId,
                        farm.type
                    );
                }).then(farm => this.parseFarm(farm))
        });
    }

    $onInit () {
        this.farm = {
            balance: "roundrobin",
            port: 80,
            probe: {
                type: ""
            }
        };
        this.saving = false;
        this.protocol = "http";
        this.type = "http";
        this.protocols = this.IpLoadBalancerConstant.protocols;
        this.balances = this.IpLoadBalancerConstant.balances;
        this.stickinesses = this.IpLoadBalancerConstant.stickinesses;
        this.probeTypes = this.IpLoadBalancerConstant.probeTypes;

        this.portLimit = this.IpLoadBalancerConstant.portLimit;

        this.zones.load();

        if (this.$stateParams.farmId) {
            this.edition = true;
            this.apiFarm.load();
        }
    }

    isProtocolDisabled (protocol) {
        if (!this.edition) {
            return false;
        }

        if (this.type === "http" && /http/.test(protocol)) {
            return false;
        } else if (this.protocol === protocol) {
            return false;
        }

        return true;
    }

    validateSelection (value) {
        return value && value !== "0";
    }

    onProtocolChange () {
        switch (this.protocol) {
            case "http":
                this.type = "http";
                this.farm.port = 80;
                break;
            case "https":
                this.type = "http";
                this.farm.port = 443;
                break;
            case "tcp":
                this.type = "tcp";
                delete this.farm.port;
                break;
            case "udp":
                this.type = "udp";
                delete this.farm.port;
                break;
            case "tls":
                this.type = "tcp";
                delete this.farm.port;
                break;
            default: break;
        }
    }

    /**
     * Parse farm object from API and send it to form.
     * @return parsed farm object
     */
    parseFarm (farm) {
        this.type = farm.type;
        this.protocol = farm.type;
        farm.port = parseInt(farm.port, 10);
        if (!farm.probe || (farm.probe && !farm.probe.type)) {
            farm.probe = { type: "" };
        }
        this.farm = angular.copy(farm);
        return farm;
    }

    /**
     * Clean farm from form and send it to API.
     * @return clean farm object
     */
    getCleanFarm () {
        const request = angular.copy(this.farm);
        delete request.type;
        delete request.zoneText;
        if (!request.probe.type) {
            delete request.probe;
        }
        return request;
    }

    editProbe () {
        this.ControllerHelper.modal.showModal({
            modalConfig: {
                templateUrl: "app/iplb/serverFarm/probe/iplb-server-farm-probe.html",
                controller: "IpLoadBalancerServerFarmProbeEditCtrl",
                controllerAs: "IpLoadBalancerServerFarmProbeEditCtrl",
                resolve: {
                    availableProbes: () => this.IpLoadBalancerServerFarmService.getAvailableFarmProbes(this.$stateParams.serviceName),
                    farm: () => this.farm,
                    edition: () => this.edition
                }
            }
        }).then(probe => {
            _.assign(this.farm, { probe });
        });
    }

    create () {
        if (this.form.$invalid) {
            return this.$q.reject();
        }
        this.saving = true;
        this.CloudMessage.flushChildMessage();
        return this.IpLoadBalancerServerFarmService.create(this.type, this.$stateParams.serviceName, this.getCleanFarm())
            .then(() => {
                this.$state.go("network.iplb.detail.server-farm");
            })
            .finally(() => {
                this.saving = false;
            });
    }

    update () {
        if (this.form.$invalid) {
            return this.$q.reject();
        }
        this.saving = true;
        this.CloudMessage.flushChildMessage();
        return this.IpLoadBalancerServerFarmService.update(this.type, this.$stateParams.serviceName, this.farm.farmId, this.getCleanFarm())
            .then(() => {
                this.$state.go("network.iplb.detail.server-farm");
            })
            .finally(() => {
                this.saving = false;
            });
    }
}

angular.module("managerApp").controller("IpLoadBalancerServerFarmEditCtrl", IpLoadBalancerServerFarmEditCtrl);
