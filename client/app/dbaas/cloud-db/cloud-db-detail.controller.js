class CloudDbDetailCtrl {
    constructor (CloudMessage, CloudNavigation) {
        this.CloudMessage = CloudMessage;
        this.CloudNavigation = CloudNavigation;
        this.messages = [];
    }

    $onInit () {
        this.CloudNavigation.init();
        this.CloudMessage.unSubscribe("dbaas.cloud-db");
        this.messageHandler = this.CloudMessage.subscribe("dbaas.cloud-db", { onMessage: () => this.refreshMessage() });
    }

    refreshMessage () {
        this.messages = this.messageHandler.getMessages();
    }
}

angular.module("managerApp").controller("CloudDbDetailCtrl", CloudDbDetailCtrl);
