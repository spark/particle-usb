import proto from './protocol';

// Mapping of request types to Protobuf messages
export const Request = {
	GET_SERIAL_NUMBER: {
		id: 21,
		request: proto.GetSerialNumberRequest,
		reply: proto.GetSerialNumberReply
	},
	RESET: {
		id: 40
	},
	FACTORY_RESET: {
		id: 41
	},
	DFU_MODE: {
		id: 50
	},
	SAFE_MODE: {
		id: 60
	},
	START_LISTENING: {
		id: 70
	},
	STOP_LISTENING: {
		id: 71
	},
	GET_DEVICE_MODE: {
		id: 72,
		request: proto.GetDeviceModeRequest,
		reply: proto.GetDeviceModeReply
	},
	SET_DEVICE_SETUP_DONE: {
		id: 73,
		request: proto.SetDeviceSetupDoneRequest,
		reply: proto.SetDeviceSetupDoneReply
	},
	LOG_CONFIG: {
		id: 80
	},
	MODULE_INFO: {
		id: 90
	},
	DIAGNOSTIC_INFO: {
		id: 100
	},
	WIFI_SET_ANTENNA: {
		id: 110,
		request: proto.WiFiSetAntennaRequest,
		reply: proto.WiFiSetAntennaReply
	},
	WIFI_GET_ANTENNA: {
		id: 111,
		request: proto.WiFiGetAntennaRequest,
		reply: proto.WiFiGetAntennaReply
	},
	WIFI_SCAN: {
		id: 112,
		request: proto.WiFiScanRequest,
		reply: proto.WiFiScanReply
	},
	WIFI_SET_CREDENTIALS: {
		id: 113,
		request: proto.WiFiSetCredentialsRequest,
		reply: proto.WiFiSetCredentialsReply
	},
	WIFI_GET_CREDENTIALS: {
		id: 114,
		request: proto.WiFiGetCredentialsRequest,
		reply: proto.WiFiGetCredentialsReply
	},
	WIFI_CLEAR_CREDENTIALS: {
		id: 115,
		request: proto.WiFiClearCredentialsRequest,
		reply: proto.WiFiClearCredentialsReply
	},
	NETWORK_SET_CONFIGURATION: {
		id: 120,
		request: proto.NetworkSetConfigurationRequest,
		reply: proto.NetworkSetConfigurationReply
	},
	NETWORK_GET_CONFIGURATION: {
		id: 121,
		request: proto.NetworkGetConfigurationRequest,
		reply: proto.NetworkGetConfigurationReply
	},
	NETWORK_GET_STATUS: {
		id: 122,
		request: proto.NetworkGetStatusRequest,
		reply: proto.NetworkGetStatusReply
	},
	SET_CLAIM_CODE: {
		id: 200,
		request: proto.SetClaimCodeRequest,
		reply: proto.SetClaimCodeReply
	},
	IS_CLAIMED: {
		id: 201,
		request: proto.IsClaimedRequest,
		reply: proto.IsClaimedReply
	},
	SET_SECURITY_KEY: {
		id: 210,
		request: proto.SetSecurityKeyRequest,
		reply: proto.SetSecurityKeyReply
	},
	GET_SECURITY_KEY: {
		id: 211,
		request: proto.GetSecurityKeyRequest,
		reply: proto.GetSecurityKeyReply
	},
	SET_SERVER_ADDRESS: {
		id: 220,
		request: proto.SetServerAddressRequest,
		reply: proto.SetServerAddressReply
	},
	GET_SERVER_ADDRESS: {
		id: 221,
		request: proto.GetServerAddressRequest,
		reply: proto.GetServerAddressReply
	},
	SET_SERVER_PROTOCOL: {
		id: 222,
		request: proto.SetServerProtocolRequest,
		reply: proto.SetServerProtocolReply
	},
	GET_SERVER_PROTOCOL: {
		id: 223,
		request: proto.GetServerProtocolRequest,
		reply: proto.GetServerProtocolReply
	},
	START_NYAN_SIGNAL: {
		id: 230
	},
	STOP_NYAN_SIGNAL: {
		id: 231
	},
	SET_SOFTAP_SSID: {
		id: 240,
		request: proto.SetSoftApSsidRequest,
		reply: proto.SetSoftApSsidReply
	},
	START_FIRMWARE_UPDATE: {
		id: 250,
		request: proto.StartFirmwareUpdateRequest,
		reply: proto.StartFirmwareUpdateReply
	},
	FINISH_FIRMWARE_UPDATE: {
		id: 251,
		request: proto.FinishFirmwareUpdateRequest,
		reply: proto.FinishFirmwareUpdateReply
	},
	CANCEL_FIRMWARE_UPDATE: {
		id: 252,
		request: proto.CancelFirmwareUpdateRequest,
		reply: proto.CancelFirmwareUpdateReply
	},
	FIRMWARE_UPDATE_DATA: {
		id: 253,
		request: proto.FirmwareUpdateDataRequest,
		reply: proto.FirmwareUpdateDataReply
	},
	DESCRIBE_STORAGE: {
		id: 260,
		request: proto.DescribeStorageRequest,
		reply: proto.DescribeStorageReply
	},
	READ_SECTION_DATA: {
		id: 261,
		request: proto.ReadSectionDataRequest,
		reply: proto.ReadSectionDataReply
	},
	WRITE_SECTION_DATA: {
		id: 262,
		request: proto.WriteSectionDataRequest,
		reply: proto.WriteSectionDataReply
	},
	CLEAR_SECTION_DATA: {
		id: 263,
		request: proto.ClearSectionDataRequest,
		reply: proto.ClearSectionDataReply
	},
	GET_SECTION_DATA_SIZE: {
		id: 264,
		request: proto.GetSectionDataSizeRequest,
		reply: proto.GetSectionDataSizeReply
	},
	// Cloud connectivity
	CLOUD_STATUS: {
		id: 300,
		request: proto.cloud.GetConnectionStatusRequest,
		reply: proto.cloud.GetConnectionStatusReply
	},
	CLOUD_CONNECT: {
		id: 301,
		request: proto.cloud.ConnectRequest,
		reply: proto.cloud.ConnectReply
	},
	CLOUD_DISCONNECT: {
		id: 302,
		request: proto.cloud.DisconnectRequest,
		reply: proto.cloud.DisconnectReply
	},
	// Cellular-specific requests
	CELLULAR_GET_ICCID: {
		id: 554,
		request: proto.cellular.GetIccidRequest,
		reply: proto.cellular.GetIccidReply
	},
	// Mesh network management
	MESH_AUTH: {
		id: 1001,
		request: proto.mesh.AuthRequest,
		reply: proto.mesh.AuthReply
	},
	MESH_CREATE_NETWORK: {
		id: 1002,
		request: proto.mesh.CreateNetworkRequest,
		reply: proto.mesh.CreateNetworkReply
	},
	MESH_START_COMMISSIONER: {
		id: 1003,
		request: proto.mesh.StartCommissionerRequest,
		reply: proto.mesh.StartCommissionerReply
	},
	MESH_STOP_COMMISSIONER: {
		id: 1004,
		request: proto.mesh.StopCommissionerRequest,
		reply: proto.mesh.StopCommissionerReply
	},
	MESH_PREPARE_JOINER: {
		id: 1005,
		request: proto.mesh.PrepareJoinerRequest,
		reply: proto.mesh.PrepareJoinerReply
	},
	MESH_ADD_JOINER: {
		id: 1006,
		request: proto.mesh.AddJoinerRequest,
		reply: proto.mesh.AddJoinerReply
	},
	MESH_REMOVE_JOINER: {
		id: 1007,
		request: proto.mesh.RemoveJoinerRequest,
		reply: proto.mesh.RemoveJoinerReply
	},
	MESH_JOIN_NETWORK: {
		id: 1008,
		request: proto.mesh.JoinNetworkRequest,
		reply: proto.mesh.JoinNetworkReply
	},
	MESH_LEAVE_NETWORK: {
		id: 1009,
		request: proto.mesh.LeaveNetworkRequest,
		reply: proto.mesh.LeaveNetworkReply
	},
	MESH_GET_NETWORK_INFO: {
		id: 1010,
		request: proto.mesh.GetNetworkInfoRequest,
		reply: proto.mesh.GetNetworkInfoReply
	},
	MESH_SCAN_NETWORKS: {
		id: 1011,
		request: proto.mesh.ScanNetworksRequest,
		reply: proto.mesh.ScanNetworksReply
	},
	MESH_GET_NETWORK_DIAGNOSTICS: {
		id: 1012,
		request: proto.mesh.GetNetworkDiagnosticsRequest,
		reply: proto.mesh.GetNetworkDiagnosticsReply
	},
	// Logging configuration
	ADD_LOG_HANDLER: {
		id: 1100,
		request: proto.logging.AddLogHandlerRequest,
		reply: proto.logging.AddLogHandlerReply
	},
	REMOVE_LOG_HANDLER: {
		id: 1101,
		request: proto.logging.RemoveLogHandlerRequest,
		reply: proto.logging.RemoveLogHandlerReply
	},
	GET_LOG_HANDLERS: {
		id: 1102,
		request: proto.logging.GetLogHandlersRequest,
		reply: proto.logging.GetLogHandlersReply
	}
};
