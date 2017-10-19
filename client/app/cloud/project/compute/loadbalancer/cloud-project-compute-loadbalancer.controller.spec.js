"use strict";

describe("Controller: CloudProjectComputeLoadbalancerCtrl", function () {

    var dataTest = readJSON('client/bower_components/ovh-api-services/src/cloud/project/loadbalancer/cloud-project-loadbalancer.service.dt.spec.json');

    // load the controller"s module
    beforeEach(module("managerAppMock"));

    var ssoAuthentication,
        $httpBackend,
        $rootScope,
        $controller,
        CloudMessage,
        OvhApiCloudProjectLoadbalancer,
        $scope;

    beforeEach(inject(function (_ssoAuthentication_, _$httpBackend_, _$rootScope_, _$controller_, _CloudProjectLoadbalancer_, _CloudMessage_) {
        ssoAuthentication = _ssoAuthentication_;
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
        $controller = _$controller_;
        OvhApiCloudProjectLoadbalancer = _CloudProjectLoadbalancer_;
        CloudMessage = _CloudMessage_;

        spyOn(CloudMessage, "error");
        spyOn(CloudMessage, "success");

        $scope = $rootScope.$new();
    }));

    afterEach(inject(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
        $scope.$destroy();
    }));

    //-----

    var CloudProjectComputeLoadbalancerCtrl;

    function initNewCtrl () {
        CloudProjectComputeLoadbalancerCtrl = $controller("CloudProjectComputeLoadbalancerCtrl", {
            $scope: $scope,
            $stateParams : {
                projectId : 'ac2b990f1d6e42899e764a8084bdf766'
            }
        });
    }

    //ssh key add model
    function expectLoadbalancerAddInitState(){
        expect(CloudProjectComputeLoadbalancerCtrl.sshAdd.serviceName).not.toBeNull();
        expect(CloudProjectComputeLoadbalancerCtrl.sshAdd.name).toBeNull();
        expect(CloudProjectComputeLoadbalancerCtrl.sshAdd.publicKey).toBeNull();
    }

    //-----

    describe("- Initialization controller in success case -", function () {

        beforeEach(function (){
            $httpBackend.whenGET(/\/cloud\/project\/[a-z0-9]+\/sshkey/).respond(200, dataTest.sshkeys);
            initNewCtrl();

            $httpBackend.flush();
        });


        xit("should set default value", function () {

            //ssh keys table
            expect(_.isEqual(CloudProjectComputeLoadbalancerCtrl.table.ssh[0].toJSON(), dataTest.sshkeys[0])).toBeTruthy();
            expect(_.isEqual(CloudProjectComputeLoadbalancerCtrl.table.ssh[1].toJSON(), dataTest.sshkeys[1])).toBeTruthy();

            expect(CloudProjectComputeLoadbalancerCtrl.loaders.table.ssh).toBeFalsy();

            expectLoadbalancerAddInitState();
        });

        //-----

        describe("- Display function -", function () {

            xit("should open and close add ssh key form", function () {
                expectLoadbalancerAddInitState();
                expect(CloudProjectComputeLoadbalancerCtrl.toggle.openAddLoadbalancer).toBeFalsy();

                //Open
                CloudProjectComputeLoadbalancerCtrl.toggleAddLoadbalancer();

                expectLoadbalancerAddInitState();
                expect(CloudProjectComputeLoadbalancerCtrl.toggle.openAddLoadbalancer).toBeTruthy();

                //Close
                CloudProjectComputeLoadbalancerCtrl.sshAdd.name = "name";
                CloudProjectComputeLoadbalancerCtrl.toggleAddLoadbalancer();

                expectLoadbalancerAddInitState();
                expect(CloudProjectComputeLoadbalancerCtrl.toggle.openAddLoadbalancer).toBeFalsy();
            });
        });

        //-----

        describe("- Add ssh key -", function () {


            describe("success case", function () {

                beforeEach(function (){
                    $httpBackend.whenPOST(/\/cloud\/project\/[a-z0-9]+\/sshkey/).respond(200, dataTest.sshkey);
                });

                xit("should reinitialize model", function () {
                    CloudProjectComputeLoadbalancerCtrl.sshAdd.name = "name";

                    spyOn(CloudProjectComputeLoadbalancerCtrl, "getLoadbalancers");

                    CloudProjectComputeLoadbalancerCtrl.postLoadbalancer();
                    $httpBackend.flush();

                    expect(CloudProjectComputeLoadbalancerCtrl.loaders.add.ssh).toBeFalsy();
                    expect(CloudProjectComputeLoadbalancerCtrl.sshAdd.name).toEqual("name");
                    expect(CloudProjectComputeLoadbalancerCtrl.getLoadbalancers.calls.count()).toEqual(1);
                    expect(CloudMessage.success.calls.count()).toEqual(1);
                });
            });


            describe("error case", function () {

                beforeEach(function (){
                    $httpBackend.whenPOST(/\/cloud\/project\/[a-z0-9]+\/sshkey/).respond(500, dataTest.error);
                });

                xit("should not sent POST request (name already exist)", function () {
                    CloudProjectComputeLoadbalancerCtrl.sshAdd.name = dataTest.sshkeys[0].name;

                    spyOn(OvhApiCloudProjectLoadbalancer, "Lexi");
                    spyOn(CloudProjectComputeLoadbalancerCtrl, "getLoadbalancers");

                    CloudProjectComputeLoadbalancerCtrl.postLoadbalancer();

                    expect(CloudProjectComputeLoadbalancerCtrl.loaders.add.ssh).toBeFalsy();
                    expect(CloudProjectComputeLoadbalancerCtrl.sshAdd.name).toEqual(dataTest.sshkeys[0].name);
                    expect(OvhApiCloudProjectLoadbalancer.Lexi.calls.any()).toEqual(false);
                    expect(CloudProjectComputeLoadbalancerCtrl.getLoadbalancers.calls.any()).toEqual(false);
                    expect(CloudMessage.error.calls.count()).toEqual(1);
                });

                xit("should throw an error when post ssh key", function () {
                    CloudProjectComputeLoadbalancerCtrl.sshAdd.name = "name";

                    spyOn(CloudProjectComputeLoadbalancerCtrl, "getLoadbalancers");

                    CloudProjectComputeLoadbalancerCtrl.postLoadbalancer();
                    $httpBackend.flush();

                    expect(CloudProjectComputeLoadbalancerCtrl.loaders.add.ssh).toBeFalsy();
                    expect(CloudProjectComputeLoadbalancerCtrl.sshAdd.name).toEqual("name");
                    expect(CloudProjectComputeLoadbalancerCtrl.getLoadbalancers.calls.any()).toEqual(false);
                    expect(CloudMessage.error.calls.count()).toEqual(1);
                });
            });
        });

        //-----

        describe("- Delete ssh key -", function () {


            describe("success case", function () {

                beforeEach(function (){
                    $httpBackend.whenDELETE(/\/cloud\/project\/[a-z0-9]+\/sshkey\/[a-z0-9]+$/).respond(200, null);
                });

                xit("should delete reload ssh keys", function () {
                    spyOn(CloudProjectComputeLoadbalancerCtrl, "getLoadbalancers");

                    CloudProjectComputeLoadbalancerCtrl.deleteLoadbalancer(dataTest.sshkey);
                    $httpBackend.flush();

                    expect(CloudProjectComputeLoadbalancerCtrl.loaders.remove.ssh).toBeFalsy();
                    expect(CloudProjectComputeLoadbalancerCtrl.getLoadbalancers.calls.count()).toEqual(1);
                    expect(CloudMessage.success.calls.count()).toEqual(1);
                });
            });


            describe("error case", function () {

                beforeEach(function (){
                    $httpBackend.whenDELETE(/\/cloud\/project\/[a-z0-9]+\/sshkey\/[a-z0-9]+$/).respond(500, dataTest.error);
                });

                xit("should throw an error when delete ssh key", function () {
                    spyOn(CloudProjectComputeLoadbalancerCtrl, "getLoadbalancers");

                    CloudProjectComputeLoadbalancerCtrl.deleteLoadbalancer(dataTest.sshkey);
                    $httpBackend.flush();

                    expect(CloudProjectComputeLoadbalancerCtrl.loaders.remove.ssh).toBeFalsy();
                    expect(CloudProjectComputeLoadbalancerCtrl.getLoadbalancers.calls.any()).toEqual(false);
                    expect(CloudMessage.error.calls.count()).toEqual(1);
                });
            });
        });
    });

    //-----

    describe("- Initialization controller in error case -", function () {

        beforeEach(function (){
            $httpBackend.whenGET(/\/cloud\/project\/[a-z0-9]+\/sshkey/).respond(500, dataTest.error);
            initNewCtrl();

            $httpBackend.flush();
        });


        xit("should throw an error when get ssh keys", function () {
            //ssh keys table
            expect(CloudProjectComputeLoadbalancerCtrl.table.ssh).toBeNull();

            expect(CloudProjectComputeLoadbalancerCtrl.loaders.table.ssh).toBeFalsy();

            expectLoadbalancerAddInitState();

            expect(CloudMessage.error.calls.count()).toEqual(1);
        });
    });

});
