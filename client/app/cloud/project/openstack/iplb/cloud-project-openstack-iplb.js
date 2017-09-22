"use strict";

angular.module("managerApp")
      .config(function ($stateProvider) {
          $stateProvider
          .state("iaas.pci-project.openstack.iplb", {
              url: "/ipLoadbalancing?validate",
              sticky: true,
              views: {
                cloudProjectOpenstack: {
                    templateUrl: "app/cloud/project/openstack/iplb/cloud-project-openstack-iplb.html",
                    controller: "CloudProjectOpenstackIplbCtrl",
                    controllerAs: "CloudProjectOpenstackIplbCtrl"
                }
            },
              translations: ["common"]
          });
  });
