import { DeviceBase, openDeviceById } from './device-base';
import { Request } from './request';
import { Result, messageForResultCode } from './result';
import { fromProtobufEnum } from './protobuf-util';
import * as usbProto from './usb-protocol';
import { RequestError, NotFoundError, TimeoutError } from './error';
import { globalOptions } from './config';

import proto from './protocol';

/**
 * Firmware module types.
 *
 * @enum {String}
 */
export const FirmwareModule = fromProtobufEnum(proto.FirmwareModuleType, {
	/** Bootloader module. */
	BOOTLOADER: 'BOOTLOADER',
	/** System part module. */
	SYSTEM_PART: 'SYSTEM_PART',
	/** User part module. */
	USER_PART: 'USER_PART',
	/** Monolithic firmware module. */
	MONO_FIRMWARE: 'MONO_FIRMWARE'
});

/**
 * Device modes.
 *
 * @enum {String}
 */
export const DeviceMode = fromProtobufEnum(proto.DeviceMode, {
	/** Device is in normal mode. */
	NORMAL: 'NORMAL_MODE',
	/** Device is in listening mode. */
	LISTENING: 'LISTENING_MODE'
});

/**
 * Logging levels.
 *
 * @enum {String}
 */
export const LogLevel = fromProtobufEnum(proto.logging.LogLevel, {
	/** Enables logging of all messages. */
	ALL: 'ALL',
	/** Enables logging of trace messages. */
	TRACE: 'TRACE',
	/** Enables logging of info messages. */
	INFO: 'INFO',
	/** Enables logging of warning messages. */
	WARN: 'WARN',
	/** Enables logging of error messages. */
	ERROR: 'ERROR',
	/** Disables logging of any messages. */
	NONE: 'NONE'
});

const DEFAULT_FIRMWARE_UPDATE_TIMEOUT = 120000;

// Helper class used by Device.timeout()
class RequestSender {
	constructor(device, timeout) {
		this.id = device.id;
		this.device = device;
		this._timeoutTime = Date.now() + timeout;
	}

	async open(options) {
		this.device = await openDeviceById(this.id, options);
	}

	async close() {
		await this.device.close();
	}

	async sendRequest(req, msg, opts) {
		if (!opts || !opts.timeout) {
			const t = this._timeoutTime - Date.now();
			if (t <= 0) {
				throw new TimeoutError();
			}
			opts = Object.assign({}, opts, { timeout: t });
		} else if (Date.now() + opts.timeout >= this._timeoutTime) {
			throw new TimeoutError();
		}
		return this.device.sendRequest(req, msg, opts);
	}

	async delay(ms) {
		if (Date.now() + ms >= this._timeoutTime) {
			throw new TimeoutError();
		}
		return new Promise((resolve) => {
			setTimeout(() => resolve(), ms);
		});
	}
}

/**
 * Basic functionality supported by most of Particle devices.
 *
 * This class is not meant to be instantiated directly. Use {@link getDevices} and
 * {@link openDeviceById} to create device instances.
 */
export class Device extends DeviceBase {
	/**
	 * Get the device's serial number.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 1.5.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise<String>}
	 */
	async getSerialNumber({ timeout = globalOptions.requestTimeout } = {}) {
		const r = await this.sendRequest(Request.GET_SERIAL_NUMBER, null /* msg */, { timeout });
		return r.serial;
	}

	/**
	 * Perform the system reset.
	 *
	 * Note: The only safe operation that can be performed on the device instance after the device
	 * resets is closing it via {@link DeviceBase#close}.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * The `force` option is supported since Device OS 2.0.0.
	 *
	 * @param {Object} [options] Options.
	 * @param {Boolean} [options.force] Reset the device immediately, even if it is busy performing
	 *        some blocking operation, such as writing to flash.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	async reset({ force = false, timeout = globalOptions.requestTimeout } = {}) {
		if (this.isInDfuMode) {
			return super.reset();
		}
		if (!force) {
			return this.sendRequest(Request.RESET, null /* msg */, { timeout });
		}
		const setup = {
			bmRequestType: usbProto.BmRequestType.HOST_TO_DEVICE,
			bRequest: usbProto.PARTICLE_BREQUEST,
			wIndex: Request.RESET.id,
			wValue: 0
		};
		return this.usbDevice.transferOut(setup);
	}

	/**
	 * Perform the factory reset.
	 *
	 * Note: The only safe operation that can be performed on the device instance after the device
	 * resets is closing it via {@link DeviceBase#close}.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	factoryReset({ timeout = globalOptions.requestTimeout } = {}) {
		return this.sendRequest(Request.FACTORY_RESET, null /* msg */, { timeout });
	}

	/**
	 * Reset and enter the DFU mode.
	 *
	 * Note: The only safe operation that can be performed on the device instance after the device
	 * resets is closing it via {@link DeviceBase#close}.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	enterDfuMode({ timeout = globalOptions.requestTimeout } = {}) {
		if (this.isInDfuMode) {
			return;
		}
		return this.timeout(timeout, async (s) => {
			await s.sendRequest(Request.DFU_MODE);
			await s.close();
			let isInDfuMode;

			while (!isInDfuMode) {
				try {
					await s.open({ includeDfu: true });
					isInDfuMode = s.device.isInDfuMode;
				} catch (error) {
					// device is reconnecting, ignore
				}
				await s.close();
				await s.delay(500);
			}
		});
	}

	/**
	 * Reset and enter the safe mode.
	 *
	 * Note: The only safe operation that can be performed on the device instance after the device
	 * resets is closing it via {@link DeviceBase#close}.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	enterSafeMode({ timeout = globalOptions.requestTimeout } = {}) {
		return this.sendRequest(Request.SAFE_MODE, null /* msg */, { timeout });
	}

	/**
	 * Enter the listening mode.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	async enterListeningMode({ timeout = globalOptions.requestTimeout } = {}) {
		return this.timeout(timeout, async (s) => {
			await s.sendRequest(Request.START_LISTENING);
			// Wait until the device enters the listening mode
			while (true) { // eslint-disable-line no-constant-condition
				const r = await s.sendRequest(Request.GET_DEVICE_MODE, null, {
					dontThrow: true // This request may not be supported by the device
				});
				if (r.result !== Result.OK || r.mode === proto.DeviceMode.LISTENING_MODE) {
					break;
				}
				await s.delay(500);
			}
		});
	}

	/**
	 * Leave the listening mode.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	leaveListeningMode({ timeout = globalOptions.requestTimeout } = {}) {
		return this.sendRequest(Request.STOP_LISTENING, null /* msg */, { timeout });
	}

	/**
	 * Get the device mode.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 1.1.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise<DeviceMode>}
	 */
	async getDeviceMode({ timeout = globalOptions.requestTimeout } = {}) {
		const r = await this.sendRequest(Request.GET_DEVICE_MODE, null /* msg */, { timeout });
		return DeviceMode.fromProtobuf(r.mode);
	}

	/**
	 * Start the Nyan LED indication.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	startNyanSignal({ timeout = globalOptions.requestTimeout } = {}) {
		return this.sendRequest(Request.START_NYAN_SIGNAL, null /* msg */, { timeout });
	}

	/**
	 * Stop the Nyan LED indication.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	stopNyanSignal({ timeout = globalOptions.requestTimeout } = {}) {
		return this.sendRequest(Request.STOP_NYAN_SIGNAL, null /* msg */, { timeout });
	}

	/**
	 * Perform the firmware update.
	 *
	 * Supported platforms:
	 * - Gen 3 (since Device OS 0.9.0)
	 * - Gen 2 (since Device OS 0.8.0)
	 *
	 * @param {Buffer} data Firmware data.
	 * @param {Object} [options] Options.
	 * @param {Number} [options.timeout] Timeout (milliseconds).
	 * @return {Promise}
	 */
	async updateFirmware(data, { timeout = DEFAULT_FIRMWARE_UPDATE_TIMEOUT } = {}) {
		if (!data.length) {
			throw new RangeError('Invalid firmware size');
		}
		return this.timeout(timeout, async (s) => {
			const { chunkSize } = await s.sendRequest(Request.START_FIRMWARE_UPDATE, { size: data.length });
			let offs = 0;
			while (offs < data.length) {
				const n = Math.min(chunkSize, data.length - offs);
				await s.sendRequest(Request.FIRMWARE_UPDATE_DATA, { data: data.slice(offs, offs + n) });
				offs += n;
			}
			await s.sendRequest(Request.FINISH_FIRMWARE_UPDATE, { validateOnly: false });
		});
	}

	/**
	 * Get firmware module data.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @param {String} module Module type.
	 * @param {Number} [index] Module index.
	 * @return {Promise<Buffer>}
	 */
	getFirmwareModule(module, index) {
		return this._getStorageInfo().then(storage => {
			const section = storage.modules.find(section => {
				return (section.moduleType === module && section.moduleIndex === index);
			});
			if (!section) {
				throw new NotFoundError();
			}
			// Get size of the firmware module
			return this._getSectionDataSize(section).then(size => {
				// Read firmware data
				return this._readSectionData(section, 0, size);
			});
		});
	}

	/**
	 * Check if the device runs a modular firmware.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @return {Promise<Boolean>}
	 */
	hasModularFirmware() {
		return this._getStorageInfo().then(storage => storage.hasModularFirmware);
	}

	/**
	 * Set factory firmware.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @param {Buffer} data Firmware data.
	 * @return {Promise}
	 */
	setFactoryFirmware(data) {
		return this._getStorageInfo().then(storage => {
			if (!storage.factory) {
				throw new NotFoundError();
			}
			return this._writeSectionData(storage.factory, 0, data);
		});
	}

	/**
	 * Get factory firmware.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @return {Promise<Buffer>}
	 */
	getFactoryFirmware() {
		return this._getStorageInfo().then(storage => {
			if (!storage.factory) {
				throw new NotFoundError();
			}
			// Get size of the firmware module
			return this._getSectionDataSize(storage.factory).then(size => {
				// Read firmware data
				return this._readSectionData(storage.factory, 0, size);
			});
		});
	}

	/**
	 * Read configuration data.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @param {Number} address Address.
	 * @param {Number} size Data size.
	 * @return {Promise<Buffer>}
	 */
	readConfigData(address, size) {
		return this._getStorageInfo().then(storage => {
			if (!storage.config) {
				throw new NotFoundError();
			}
			return this._readSectionData(storage.config, address, size);
		});
	}

	/**
	 * Write configuration data.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @param {Number} address Address.
	 * @param {Buffer} data Data.
	 * @return {Promise}
	 */
	writeConfigData(address, data) {
		return this._getStorageInfo().then(storage => {
			if (!storage.config) {
				throw new NotFoundError();
			}
			return this._writeSectionData(storage.config, address, data);
		});
	}

	/**
	 * Get size of the configuration data.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @return {Promise<Number>}
	 */
	getConfigDataSize() {
		return this._getStorageInfo().then(storage => {
			if (!storage.config) {
				throw new NotFoundError();
			}
			return storage.config.size;
		});
	}

	/**
	 * Read from EEPROM.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @param {Number} address Address.
	 * @param {Number} size Data size.
	 * @return {Promise<Buffer>}
	 */
	readEeprom(address, size) {
		return this._getStorageInfo().then(storage => {
			if (!storage.eeprom) {
				throw new NotFoundError();
			}
			return this._readSectionData(storage.eeprom, address, size);
		});
	}

	/**
	 * Write to EEPROM.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @param {Number} address Address.
	 * @param {Buffer} data Data.
	 * @return {Promise}
	 */
	writeEeprom(address, data) {
		return this._getStorageInfo().then(storage => {
			if (!storage.eeprom) {
				throw new NotFoundError();
			}
			return this._writeSectionData(storage.eeprom, address, data);
		});
	}

	/**
	 * Clear EEPROM.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @return {Promise}
	 */
	clearEeprom() {
		return this._getStorageInfo().then(storage => {
			if (!storage.eeprom) {
				throw new NotFoundError();
			}
			return this._clearSectionData(storage.eeprom);
		});
	}

	/**
	 * Get size of the EEPROM.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * Supported platforms:
	 * - Gen 2 (since Device OS 0.8.0, deprecated in 2.0.0)
	 *
	 * @return {Promise<Number>}
	 */
	getEepromSize() {
		return this._getStorageInfo().then(storage => {
			if (!storage.eeprom) {
				throw new NotFoundError();
			}
			return storage.eeprom.size;
		});
	}

	/**
	 * Add a log handler.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * @param {Object} options Options.
	 * @param {String} options.id Handler ID.
	 * @param {String} options.stream Output stream: `Serial`, `Serial1`, `USBSerial1`, etc.
	 * @param {String} [options.format] Message format: `default`, `json`.
	 * @param {String} [options.level] Default logging level: `trace`, `info`, `warn`, `error`, `none`, `all`.
	 * @param {Array} [options.filters] Category filters.
	 * @param {Number} [options.baudRate] Baud rate.
	 * @return {Promise}
	 */
	async addLogHandler({ id, stream, format, level, filters, baudRate }) {
		const req = {
			id,
			level: LogLevel.toProtobuf(level || 'all')
		};
		switch ((format || 'default').toLowerCase()) {
			case 'default': {
				req.handlerType = proto.logging.LogHandlerType.DEFAULT_STREAM_HANDLER;
				break;
			}
			case 'json': {
				req.handlerType = proto.logging.LogHandlerType.JSON_STREAM_HANDLER;
				break;
			}
			default: {
				throw new RangeError(`Unknown message format: ${format}`);
			}
		}
		if (!stream) {
			throw new RangeError('Output stream is not specified');
		}
		switch (stream.toLowerCase()) {
			case 'serial': {
				req.streamType = proto.logging.StreamType.USB_SERIAL_STREAM;
				req.serial = {
					index: 0
				};
				break;
			}
			case 'usbserial1': {
				req.streamType = proto.logging.StreamType.USB_SERIAL_STREAM;
				req.serial = {
					index: 1
				};
				break;
			}
			case 'serial1': {
				req.streamType = proto.logging.StreamType.HW_SERIAL_STREAM;
				req.serial = {
					index: 1,
					baudRate
				};
				break;
			}
			default: {
				throw new RangeError(`Unknown output stream: ${stream}`);
			}
		}
		if (filters) {
			req.filters = filters.map(f => ({
				category: f.category,
				level: LogLevel.toProtobuf(f.level)
			}));
		}
		return this.sendRequest(Request.ADD_LOG_HANDLER, req);
	}

	/**
	 * Remove a log handler.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * @param {Object} options Options.
	 * @param {String} options.id Handler ID.
	 * @return {Promise}
	 */
	async removeLogHandler({ id }) {
		return this.sendRequest(Request.REMOVE_LOG_HANDLER, { id });
	}

	/**
	 * Get the list of active log handlers.
	 *
	 * @deprecated This method is not guaranteed to work with recent versions of Device OS and it will
	 *             be removed in future versions of this library.
	 *
	 * @return {Promise<Array<Object>>}
	 */
	async getLogHandlers() {
		const rep = await this.sendRequest(Request.GET_LOG_HANDLERS);
		return rep.handlers.map(h => ({
			id: h.id
		}));
	}

	// Sends a Protobuf-encoded request
	sendRequest(req, msg, opts) {
		let buf = null;
		if (msg && req.request) {
			const m = req.request.create(msg); // Protobuf message object
			buf = req.request.encode(m).finish();
		}
		return this.sendControlRequest(req.id, buf, opts).then(rep => {
			let r = undefined;
			if (opts && opts.dontThrow) {
				r = { result: rep.result };
			} else if (rep.result !== Result.OK) {
				throw new RequestError(rep.result, messageForResultCode(rep.result));
			}
			if (req.reply) {
				if (rep.data) {
					// Parse the response message
					r = Object.assign(req.reply.decode(rep.data), r);
				} else {
					// Create a message with default-initialized properties
					r = Object.assign(req.reply.create(), r);
				}
			}
			return r;
		});
	}

	// This method is used to send multiple requests to the device. The overall execution time can be
	// limited via the `ms` argument (optional)
	async timeout(ms, fn) {
		if (typeof ms === 'function') {
			fn = ms;
			ms = undefined;
		}
		if (!ms) {
			ms = globalOptions.requestTimeout; // Default timeout
		}
		const s = new RequestSender(this, ms);
		return fn(s);
	}

	_readSectionData(section, offset, size) {
		const data = Buffer.alloc(size);
		let chunkSize = 4096;
		let chunkOffs = 0;
		const readChunk = () => {
			if (chunkOffs + chunkSize > size) {
				chunkSize = size - chunkOffs;
			}
			if (chunkSize === 0) {
				return Promise.resolve(data);
			}
			return this.sendRequest(Request.READ_SECTION_DATA, {
				storage: section.storageIndex,
				section: section.sectionIndex,
				offset: offset + chunkOffs,
				size: chunkSize
			}).then(rep => {
				rep.data.copy(data, chunkOffs);
				chunkOffs += chunkSize;
				return readChunk();
			});
		};
		return readChunk();
	}

	_writeSectionData(section, offset, data) {
		return Promise.resolve().then(() => {
			if (section.needClear) {
				return this._clearSectionData(section);
			}
		}).then(() => {
			let chunkSize = 4096;
			let chunkOffs = 0;
			const writeChunk = () => {
				if (chunkOffs + chunkSize > data.length) {
					chunkSize = data.length - chunkOffs;
				}
				if (chunkSize === 0) {
					return Promise.resolve();
				}
				return this.sendRequest(Request.WRITE_SECTION_DATA, {
					storage: section.storageIndex,
					section: section.sectionIndex,
					offset: offset + chunkOffs,
					data: data.slice(chunkOffs, chunkOffs + chunkSize)
				}).then(() => {
					chunkOffs += chunkSize;
					return writeChunk();
				});
			};
			return writeChunk();
		});
	}

	_clearSectionData(section) {
		return this.sendRequest(Request.CLEAR_SECTION_DATA, {
			storage: section.storageIndex,
			section: section.sectionIndex
		});
	}

	_getSectionDataSize(section) {
		return this.sendRequest(Request.GET_SECTION_DATA_SIZE, {
			storage: section.storageIndex,
			section: section.sectionIndex
		}).then(rep => rep.size);
	}

	_getStorageInfo() {
		// Check if there's a cached storage info
		if (this._storageInfo) {
			return Promise.resolve(this._storageInfo);
		}
		// Request storage info from the device
		return this.sendRequest(Request.DESCRIBE_STORAGE).then(rep => {
			const storage = {
				modules: [],
				factory: null,
				config: null,
				eeprom: null,
				hasModularFirmware: true
			};
			for (let storageIndex = 0; storageIndex < rep.storage.length; ++storageIndex) {
				const pbStorage = rep.storage[storageIndex];
				for (let sectionIndex = 0; sectionIndex < pbStorage.sections.length; ++sectionIndex) {
					const pbSection = pbStorage.sections[sectionIndex];
					const section = {
						storageIndex: storageIndex,
						sectionIndex: sectionIndex,
						size: pbSection.size,
						needClear: !!(pbSection.flags & proto.SectionFlag.NEED_CLEAR)
					};
					switch (pbSection.type) {
						// Firmware module
						case proto.SectionType.FIRMWARE: {
							const pbFirmwareModule = pbSection.firmwareModule;
							if (pbFirmwareModule.type === proto.FirmwareModuleType.MONO_FIRMWARE) {
								storage.hasModularFirmware = false;
							}
							section.moduleType = FirmwareModule.fromProtobuf(pbFirmwareModule.type);
							if (pbFirmwareModule.index) {
								section.moduleIndex = pbFirmwareModule.index;
							}
							storage.modules.push(section);
							break;
						}
						// Factory firmware
						case proto.SectionType.FACTORY_BACKUP: {
							storage.factory = section;
							break;
						}
						// Device configuration
						case proto.SectionType.CONFIG: {
							storage.config = section;
							break;
						}
						// EEPROM
						case proto.SectionType.EEPROM: {
							storage.eeprom = section;
							break;
						}
					}
				}
			}
			this._storageInfo = storage;
			this.once('closed', () => {
				this._storageInfo = null;
			});
			return this._storageInfo;
		});
	}
}
