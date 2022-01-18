//############### Config ###############
// Query interval in milliseconds
const interval_ms = 5000;
// Solax IP
const solaxIP = '192.168.1.135';
// Solax Pass
const solaxPass = ''
// Root Datapoint
const dataPointRoot = '0_userdata.0.Solax_X1_Mini';
//############### Config end ############

const axios = require('axios').default;
let requestTimer;

const axiosConfig = {
    timeout: 1000,
    headers: {
        'X-Forwarded-For': '5.8.8.8'
    }
}

let isOnline = false;
const stateCache= [];

//{"type":"X1-Boost-Air-Mini","SN":"XXXXXXXXXX","ver":"2.033.20","Data":[0.3,0,67.1,0,0.3,227.5,11,21,0,0.2,0,21,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49.99,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Information":[0.6,4,"X1-Boost-Air-Mini","XXXXXXXXXX",1,2.15,0,1.35,0]}

const root_dataPoints = {
    type: { name:'info.inverter_type', description:'Inverter Type', type: 'string'},
    SN: { name:'info.comm_module_sn', description:'Unique identifier of communication module (Registration No.)', type: 'string'},
    ver: { name:'info.comm_firmware_version', description:'Firmware of communication module', type: 'string'},
};

const information_dataPoints = {
    0: { name:'info.total_size_of_power', description:'Total Size of Power', type: 'number',  unit:'kW'},
    //1: { name:'info.comm_module_sn', description:'Unique identifier of communication module (Registration No.)', type: 'string'},
    //2: { name:'info.comm_firmware_version', description:'Firmware of communication module', type: 'string'},
    3: { name:'info.inverter_sn', description:'Unique identifier of inverter (Serial No.)', type: 'string'},
    //4: { name:'info.comm_firmware_version', description:'Firmware of communication module', type: 'string'},
    //5: { name:'info.comm_firmware_version', description:'Firmware of communication module', type: 'string'},
    //6: { name:'info.comm_firmware_version', description:'Firmware of communication module', type: 'string'},
    //7: { name:'info.comm_firmware_version', description:'Firmware of communication module', type: 'string'},
    //8: { name:'info.comm_firmware_version', description:'Firmware of communication module', type: 'string'},
};

const data_dataPoints = {      
    isOnline: { name:'info.online', description:'Inverter Online', type: 'boolean'},
    // 'PV1 Current': (0, 'A'),
    0: { name:'data.pv1_current', description:'PV1 Current', type: 'number', unit:'A' },
    // 'PV2 Current': (1, 'A'),
    1: { name:'data.pv2_current', description:'PV2 Current', type: 'number', unit:'A' },
    // 'PV1 Voltage': (2, 'V'),
    2: { name:'data.pv1_voltage', description:'PV1 Voltage', type: 'number', unit:'V' },
    // 'PV2 Voltage': (3, 'V'),
    3: { name:'data.pv2_voltage', description:'PV2 Voltage', type: 'number', unit:'V' },
    // 'Output Current': (4, 'A'),
    4: { name:'data.output_current', description:'Output Current', type: 'number', unit:'A' },
    // 'AC Voltage': (5, 'V'),
    5: { name:'data.ac_voltage', description:'AC Voltage', type: 'number', unit:'V' },
    // 'AC Power': (6, 'W'),
    6: { name:'data.ac_power', description:'AC Power', type: 'number', unit:'W' },
    // 'Inverter Temperature': (7, 'C'),
    7: { name:'data.inverter_temp', description:'Inverter Temperature', type: 'number', unit:'C' },
    // 'Today\'s Energy': (8, 'kWh'),
    8: { name:'data.energy_Today', description:'Today\'s Energy', type: 'number', unit:'kWh' },
    // 'Total Energy': (9, 'kWh'),
    9: { name:'data.energy_total', description:'Total Energy', type: 'number', unit:'kWh' },
    // 'Exported Power': (10, 'W'),
    10: { name:'data.exported_power', description:'Exported Power', type: 'number', unit:'W' },
    // 'PV1 Power': (11, 'W'),
    11: { name:'data.pv1_power', description:'PV1 Power', type: 'number', unit:'W' },
    // 'PV2 Power': (12, 'W'),
    12: { name:'data.pv2_power', description:'PV2 Power', type: 'number', unit:'W' },

    // ssdsd.INV1BATTERYVOLTAGE = apiData.Data[13];
    // ssdsd.INV1BATTERYCURRENT = apiData.Data[14];
    // ssdsd.INV1BATTERYPOWER = apiData.Data[15];
    // ssdsd.INV1BATTERYTEMPERATURE = apiData.Data[16];
    // ssdsd.INV1BATTERYCAPACITYREMAINING = apiData.Data[21];

    // 'Total Feed-in Energy': (41, 'kWh'),
    41: { name:'data.total_feed_in_energy', description:'Total Feed-in Energy', type: 'number', unit:'kWh' },
    // 'Total Consumption': (42, 'kWh'),
    42: { name:'data.total_consumption', description:'Total Consumption', type: 'number', unit:'kWh' },
    // 'Power Now': (43, 'W'),
    43: { name:'data.power_now', description:'Power Now', type: 'number', unit:'W' },
    // 'Grid Frequency': (50, 'Hz'),
    50: { name:'data.grid_frequency', description:'Grid Frequency', type: 'number', unit:'Hz' },

    // ssdsd.INV1EPSVOLTAGE = apiData.Data[53];
    // ssdsd.INV1EPSCURRENT = apiData.Data[54];
    // ssdsd.INV1EPSPOWER = apiData.Data[55];
    // ssdsd.INV1EPSFREQUENCY = apiData.Data[56];
};

createStateAsync(`${dataPointRoot}.${data_dataPoints['isOnline'].name}`, {name: data_dataPoints['isOnline'].description, type: data_dataPoints['isOnline'].type, read: true, write: false, role: 'value'});

requestAPI();

async function requestAPI() {  
    try {
        const url = `http://${solaxIP}:80/?optType=ReadRealTimeData&pwd=${solaxPass}`;
        const apiData = (await axios.post(url, axiosConfig)).data;

        isOnline = true;
        //log(JSON.stringify(apiData))

        for(const key in apiData){
            const dataPoint = root_dataPoints[key];     
            if (!dataPoint){
                continue;            
            }
            
            setDataPoint(dataPoint,apiData[key])
        }   

        for(const key in apiData.Data){           
            const dataPoint = data_dataPoints[key];
            if (!dataPoint){
                continue;
            }

            setDataPoint(dataPoint,apiData.Data[key])
        }       

        for(const key in apiData.Information){           
            const dataPoint = information_dataPoints[key];
            if (!dataPoint){
                continue;
            }

            setDataPoint(dataPoint,apiData.Information[key])
        }
        
        if (requestTimer) {
            clearTimeout(requestTimer);
        }

    } catch (e) {
        isOnline = false;
    }

    setState(`${dataPointRoot}.${data_dataPoints['isOnline'].name}`, isOnline, true);
    requestTimer = setTimeout(() => { requestAPI(); }, interval_ms);
}

async function setDataPoint(dataPoint, data){
    const dataPointPath = `${dataPointRoot}.${dataPoint.name}`;
    
    if (!stateCache.includes(dataPoint.name)){
        await createStateAsync(dataPointPath, {name: dataPoint.description, type: dataPoint.type, unit: dataPoint.unit, read: true, write: false, role: 'value'});
        stateCache.push(dataPoint.name);
    }

    setState(dataPointPath, data, true);
}
