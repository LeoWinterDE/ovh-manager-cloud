// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!  TODO REMOVE THIS FILE FROM EXCLUDE LIST IN KARMA.CONF.JS FILE   !!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

"use strict";

describe("Controller: CloudProjectOpenstackIplbCtrl", function () {

    var dataTest = readJSON('client/bower_components/ovh-api-services/src/cloud/project/snapshot/cloud-project-snapshot.service.dt.spec.json');

    // load the controller"s module
    beforeEach(module("managerAppMock"));

    var ssoAuthentication,
        $httpBackend,
        $rootScope,
        $controller,
        $timeout,
        Toast,
        OvhApiCloudProjectSnapshot,
        CloudProjectOrchestrator,
        $state,
        $scope;

    beforeEach(inject(function (_ssoAuthentication_, _$httpBackend_, _$rootScope_, _$controller_, _CloudProjectSnapshot_, _Toast_, _$timeout_, _CloudProjectOrchestrator_) {

        ssoAuthentication = _ssoAuthentication_;
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
        $controller = _$controller_;
        $timeout = _$timeout_;
        OvhApiCloudProjectSnapshot = _CloudProjectSnapshot_;
        Toast = _Toast_;
        CloudProjectOrchestrator = _CloudProjectOrchestrator_;
        $state = {
            go : function(){
                return true;
            }
        };

        spyOn(Toast, "error");
        spyOn(Toast, "success");
        spyOn(Toast, "info");
        spyOn(OvhApiCloudProjectSnapshot.Lexi(), "resetQueryCache");

        $scope = $rootScope.$new();
        $scope.searchSnapshotForm = {
            $valid : true
        };
    }));

    afterEach(inject(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
        $scope.$destroy();
    }));

    //-----

    var CloudProjectOpenstackIplbCtrl;

    function initNewCtrl () {
        CloudProjectOpenstackIplbCtrl = $controller("CloudProjectOpenstackIplbCtrl", {
            $scope : $scope,
            $state : $state,
            $stateParams : {
                projectId : 'ac2b990f1d6e42899e764a8084bdf766'
            }
        });
        $scope.CloudProjectOpenstackIplbCtrl = CloudProjectOpenstackIplbCtrl;
    }

    //-----

    describe("- Initialization controller in success case -", function () {

        beforeEach(function (){
            $httpBackend.whenGET(/\/cloud\/project\/[a-z0-9]+\/snapshot/).respond(200, dataTest.snapshots);
            initNewCtrl();

            $httpBackend.flush();
        });

        xit("should set default value", function () {
            expect(OvhApiCloudProjectSnapshot.Lexi().resetQueryCache.calls.any()).toEqual(false);

            expect(CloudProjectOpenstackIplbCtrl.table.snapshot).toBeArrayOfObjects();
            expect(CloudProjectOpenstackIplbCtrl.table.snapshotFilter).toBeArrayOfObjects();
            expect(CloudProjectOpenstackIplbCtrl.table.selected).toEqual({});
            expect(CloudProjectOpenstackIplbCtrl.table.autoSelected).toEqual([]);

            expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshot[0].toJSON(), dataTest.snapshots[0])).toBeTruthy();
            expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshot[1].toJSON(), dataTest.snapshots[1])).toBeTruthy();
            expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshotFilter[0].toJSON(), dataTest.snapshots[6])).toBeTruthy();
            expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshotFilter[1].toJSON(), dataTest.snapshots[0])).toBeTruthy();

            expect(CloudProjectOpenstackIplbCtrl.toggle.snapshotDeleteId).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeFalsy();

            expect(CloudProjectOpenstackIplbCtrl.loaders.table.snapshot).toBeFalsy();
            expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshot).toBeFalsy();
            expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshotMulti).toBeFalsy();

            expect(CloudProjectOpenstackIplbCtrl.order.by).toEqual('name');
            expect(CloudProjectOpenstackIplbCtrl.order.reverse).toBeFalsy();

            expect(CloudProjectOpenstackIplbCtrl.search.open).toBeFalsy();
            expect(CloudProjectOpenstackIplbCtrl.search.name).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.search.minDisk).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.search.creationStart).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.search.creationEnd).toBeNull();
        });

        //-----

        describe("- Display function -", function () {

            xit("should open and close search form.", function () {

                //Should open search bar
                CloudProjectOpenstackIplbCtrl.toggleSearchBar();

                expect(CloudProjectOpenstackIplbCtrl.search.open).toBeTruthy();

                CloudProjectOpenstackIplbCtrl.search.name = "pikachu";
                CloudProjectOpenstackIplbCtrl.search.minDisk = 40;
                CloudProjectOpenstackIplbCtrl.search.creationStart = "Thu Mar 10 2015 00:00:00 GMT+0100 (CET)";
                CloudProjectOpenstackIplbCtrl.search.creationEnd = "Thu Mar 15 2015 00:00:00 GMT+0100 (CET)";

                $scope.$apply();
                $timeout.flush();

                expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshotFilter[0].toJSON(), dataTest.snapshots[5])).toBeTruthy();
                expect(CloudProjectOpenstackIplbCtrl.table.snapshotFilter.length).toEqual(1);

                //Should close search bar without reinit search values but not apply filter
                CloudProjectOpenstackIplbCtrl.toggleSearchBar();

                $scope.$apply();
                $timeout.flush();

                expect(CloudProjectOpenstackIplbCtrl.search.open).toBeFalsy();
                expect(CloudProjectOpenstackIplbCtrl.search.name ).toEqual('pikachu');
                expect(CloudProjectOpenstackIplbCtrl.search.minDisk ).toEqual(40);
                expect(CloudProjectOpenstackIplbCtrl.search.creationStart ).toEqual('Thu Mar 10 2015 00:00:00 GMT+0100 (CET)');
                expect(CloudProjectOpenstackIplbCtrl.search.creationEnd ).toEqual('Thu Mar 15 2015 00:00:00 GMT+0100 (CET)');

                expect(CloudProjectOpenstackIplbCtrl.table.snapshotFilter.length).toEqual(CloudProjectOpenstackIplbCtrl.table.snapshot.length);

                //Should re-open search bar and reinit search values
                CloudProjectOpenstackIplbCtrl.toggleSearchBar();

                $scope.$apply();
                $timeout.flush();

                expect(CloudProjectOpenstackIplbCtrl.search.open).toBeTruthy();
                expect(CloudProjectOpenstackIplbCtrl.search.name).toBeNull();
                expect(CloudProjectOpenstackIplbCtrl.search.minDisk).toBeNull();
                expect(CloudProjectOpenstackIplbCtrl.search.creationStart).toBeNull();
                expect(CloudProjectOpenstackIplbCtrl.search.creationEnd).toBeNull();

                expect(CloudProjectOpenstackIplbCtrl.table.snapshotFilter.length).toEqual(CloudProjectOpenstackIplbCtrl.table.snapshot.length);
            });

            //-----

            xit("should sort table.", function () {

                //init by name
                expect(CloudProjectOpenstackIplbCtrl.order.by).toEqual('name');
                expect(CloudProjectOpenstackIplbCtrl.order.reverse).toBeFalsy();

                expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshot[0].toJSON(), dataTest.snapshots[0])).toBeTruthy();
                expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshotFilter[0].toJSON(), dataTest.snapshots[6])).toBeTruthy();

                //sort by minDisk asc
                CloudProjectOpenstackIplbCtrl.orderBy('minDisk');

                expect(CloudProjectOpenstackIplbCtrl.order.by).toEqual('minDisk');
                expect(CloudProjectOpenstackIplbCtrl.order.reverse).toBeFalsy();

                expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshot[0].toJSON(), dataTest.snapshots[0])).toBeTruthy();
                expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshotFilter[0].toJSON(), dataTest.snapshots[4])).toBeTruthy();

                //sort by minDisk desc
                CloudProjectOpenstackIplbCtrl.orderBy('minDisk');

                expect(CloudProjectOpenstackIplbCtrl.order.by).toEqual('minDisk');
                expect(CloudProjectOpenstackIplbCtrl.order.reverse).toBeTruthy();

                expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshot[0].toJSON(), dataTest.snapshots[0])).toBeTruthy();
                expect(_.isEqual(CloudProjectOpenstackIplbCtrl.table.snapshotFilter[7].toJSON(), dataTest.snapshots[4])).toBeTruthy();

            });

            //-----

            xit("should call CloudProjectOrchestrator and $state.go to install snapshot.", function () {
                spyOn(CloudProjectOrchestrator, "askToCreateInstanceFromSnapshot");
                spyOn($state, "go");

                CloudProjectOpenstackIplbCtrl.createVmBySnapshot(CloudProjectOpenstackIplbCtrl.table.snapshot[0].toJSON());

                expect(CloudProjectOrchestrator.askToCreateInstanceFromSnapshot.calls.count()).toEqual(1);
                expect($state.go.calls.count()).toEqual(1);
                expect(Toast.info.calls.count()).toEqual(1);
            });

            //-----

            xit("should select table line and open/close confirm delete.", function () {

                expect(CloudProjectOpenstackIplbCtrl.table.selected).toEqual({});
                expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeFalsy();
                expect(CloudProjectOpenstackIplbCtrl.getSelectedCount()).toEqual(0);

                //select 1st line
                CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[0].id] = true;
                $scope.$apply();
                expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeFalsy();
                expect(CloudProjectOpenstackIplbCtrl.getSelectedCount()).toEqual(1);

                //Confirm
                CloudProjectOpenstackIplbCtrl.toggleDeleteMultiConfirm();
                expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeTruthy();

                //select 2nd line
                CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[2].id] = true;
                $scope.$apply();

                expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeFalsy();
                expect(CloudProjectOpenstackIplbCtrl.getSelectedCount()).toEqual(2);

                //Confirm
                CloudProjectOpenstackIplbCtrl.toggleDeleteMultiConfirm();
                expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeTruthy();

                //Cancel
                CloudProjectOpenstackIplbCtrl.toggleDeleteMultiConfirm();
                expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeFalsy();

                expect(CloudProjectOpenstackIplbCtrl.table.selected).toEqual({});
            });
        });


        //-----

        describe("- Delete snapshot -", function () {

            describe("success case", function () {

                beforeEach(function (){
                    $httpBackend.whenDELETE(/\/cloud\/project\/[a-z0-9]+\/snapshot\/[a-z0-9\-]+/).respond(200, null);
                });

                xit("should delete one snapshot", function () {
                    CloudProjectOpenstackIplbCtrl.toggle.snapshotDeleteId = dataTest.snapshots[0].id;

                    CloudProjectOpenstackIplbCtrl.deleteSnapshot(dataTest.snapshots[0]);
                    $httpBackend.flush();

                    expect(OvhApiCloudProjectSnapshot.Lexi().resetQueryCache.calls.count()).toEqual(1);
                    expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshot).toBeFalsy();
                    expect(Toast.success.calls.count()).toEqual(1);
                });

            });

            describe("error case", function () {

                beforeEach(function (){
                    $httpBackend.whenDELETE(/\/cloud\/project\/[a-z0-9]+\/snapshot\/[a-z0-9\-]+/).respond(500, dataTest.error);
                });

                xit("should throw an error when delete one snapshot", function () {
                    CloudProjectOpenstackIplbCtrl.toggle.snapshotDeleteId = dataTest.snapshots[0].id;

                    spyOn(CloudProjectOpenstackIplbCtrl, "getSnapshot");

                    CloudProjectOpenstackIplbCtrl.deleteSnapshot(dataTest.snapshots[0]);
                    $httpBackend.flush();

                    expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshot).toBeFalsy();
                    expect(CloudProjectOpenstackIplbCtrl.getSnapshot.calls.any()).toEqual(false);
                    expect(Toast.error.calls.count()).toEqual(1);
                });
            });

        });


        //-----

        describe("- Delete multi snapshot -", function () {

            describe("success case", function () {

                beforeEach(function (){
                    $httpBackend.whenDELETE(/\/cloud\/project\/[a-z0-9]+\/snapshot\/[a-z0-9\-]+/).respond(200, null);
                });

                xit("should delete multi snapshot", function () {

                    expect(CloudProjectOpenstackIplbCtrl.table.selected).toEqual({});

                    //select 1st line
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[0].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[1].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[2].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[3].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[4].id] = true;

                    expect(CloudProjectOpenstackIplbCtrl.table.autoSelected).toEqual([]);

                    CloudProjectOpenstackIplbCtrl.deleteMultiSnapshot();
                    $httpBackend.flush();

                    expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshotMulti).toBeFalsy();
                    expect(OvhApiCloudProjectSnapshot.Lexi().resetQueryCache.calls.count()).toEqual(1);
                    expect(Toast.success.calls.count()).toEqual(1);
                    expect(CloudProjectOpenstackIplbCtrl.table.autoSelected).toEqual([]);
                    //expect(CloudProjectOpenstackIplbCtrl.table.selected).toEqual({});
                });

            });

            describe("error case", function () {

                beforeEach(function (){
                    $httpBackend.whenDELETE(/\/cloud\/project\/[a-z0-9]+\/snapshot\/[a-z0-9\-]*[a-df-z0-9\-]$/).respond(200, null);
                    $httpBackend.whenDELETE(/\/cloud\/project\/[a-z0-9]+\/snapshot\/[a-z0-9\-]+e$/).respond(500, dataTest.error);
                });

                xit("should throw an error when delete one snapshot", function () {

                    expect(CloudProjectOpenstackIplbCtrl.table.selected).toEqual({});

                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[0].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[1].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[2].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[3].id] = true;
                    CloudProjectOpenstackIplbCtrl.table.selected[CloudProjectOpenstackIplbCtrl.table.snapshotFilter[4].id] = true;

                    expect(CloudProjectOpenstackIplbCtrl.table.autoSelected).toEqual([]);

                    CloudProjectOpenstackIplbCtrl.deleteMultiSnapshot();
                    $httpBackend.flush();

                    expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshotMulti).toBeFalsy();
                    expect(OvhApiCloudProjectSnapshot.Lexi().resetQueryCache.calls.count()).toEqual(1);
                    expect(Toast.error.calls.count()).toEqual(1);

                    expect(CloudProjectOpenstackIplbCtrl.table.autoSelected.length).toEqual(1);
                    //expect(CloudProjectOpenstackIplbCtrl.getSelectedCount()).toEqual(1);
                });
            });
        });
    });

    //-----

    describe("- Initialization controller in error case -", function () {

        beforeEach(function (){
            $httpBackend.whenGET(/\/cloud\/project\/[a-z0-9]+\/snapshot/).respond(500, dataTest.error);
            initNewCtrl();

            $httpBackend.flush();
        });


        xit("should throw an error when get snapshots", function () {
            expect(OvhApiCloudProjectSnapshot.Lexi().resetQueryCache.calls.any()).toEqual(false);

            expect(CloudProjectOpenstackIplbCtrl.table.snapshot).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.table.snapshotFilter).toEqual([]);
            expect(CloudProjectOpenstackIplbCtrl.table.selected).toEqual({});
            expect(CloudProjectOpenstackIplbCtrl.table.autoSelected).toEqual([]);

            expect(CloudProjectOpenstackIplbCtrl.toggle.snapshotDeleteId).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.toggle.openDeleteMultiConfirm).toBeFalsy();

            expect(CloudProjectOpenstackIplbCtrl.loaders.table.snapshot).toBeFalsy();
            expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshot).toBeFalsy();
            expect(CloudProjectOpenstackIplbCtrl.loaders.remove.snapshotMulti).toBeFalsy();

            expect(CloudProjectOpenstackIplbCtrl.order.by).toEqual('name');
            expect(CloudProjectOpenstackIplbCtrl.order.reverse).toBeFalsy();

            expect(CloudProjectOpenstackIplbCtrl.search.open).toBeFalsy();
            expect(CloudProjectOpenstackIplbCtrl.search.name).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.search.minDisk).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.search.creationStart).toBeNull();
            expect(CloudProjectOpenstackIplbCtrl.search.creationEnd).toBeNull();

            expect(Toast.error.calls.count()).toEqual(1);
        });
    });
});
