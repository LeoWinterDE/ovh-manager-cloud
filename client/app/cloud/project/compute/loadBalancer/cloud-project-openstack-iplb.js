"use strict";

angular.module("managerApp")
      .config(function ($stateProvider) {
          $stateProvider
          .state("iaas.pci-project.compute.iplb.old", {
              url: "/ipLoadbalancing?validate",
              sticky: true,
              views: {
                cloudProjectOpenstack: {
                    templateUrl: "app/cloud/project/compute/loadBalancer/cloud-project-openstack-iplb.html",
                    controller: "CloudProjectOpenstackIplbCtrl",
                    controllerAs: "CloudProjectOpenstackIplbCtrl"
                }
            },
              translations: ["common"]
          });
  });
