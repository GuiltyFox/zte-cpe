const axios = require('axios')
const qs = require('qs');

const util = require('./src/util');

const DEFAULT_COMMENT = 'a';

class ZTECPE {
    constructor(hostname = '192.168.1.1'){
        this.address = hostname;
        this.util = util;
        this.client = axios.create({
            baseURL: `http://${hostname}/goform/`,
            insecureHTTPParser: true, // Important for nodejs 12+
        });
    }

    // UTIL
    goformSet(endpoint, content = {}){
        const data = Object.assign(
            {
                goformId: endpoint,
                isTest: false,
            },
            content,
        );
        return this.client({
            url: "goform_set_cmd_process",
            method: 'post',
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            data: qs.stringify(data)
        }).then((response) => {
            return response.data;
        }).catch(e => ({ result: 'failure' }));
    }
    goformGet(content = {}){
        const params = Object.assign(
            {
                isTest: false,
                _: new Date().getTime(),
            },
            content,
        );
        return this.client({
            url: "goform_get_cmd_process",
            params
        }).then((response) => {
            return response.data;
        }).catch(e => ({ result: 'failure' }));
    }
    goformGetMultiData(items){
        return this.goformGet({
            multi_data: 1,
            cmd: Array.isArray(items) ? items.join(',') : items,
        })
    }
    goformGetSingleData(item){
        return this.goformGet({
            cmd: item,
        })
    }

    // PASSWORD/LOGIN RELATED
    login(password){
        return this.goformSet(
            'LOGIN',
            {
                password: util.stringToBase64(password),
            }
        )
    }
    logout(){
        return this.goformSet('LOGOUT');
    }
    isLogged(){
        return this.goformGetSingleData('loginfo')
        .then(r => r.loginfo == 'ok');
    }

    // SMS RELATED
    getSMS(page = 0, smsPerPage = 500){
        return this.goformGet(
            {
                cmd: 'sms_data_total',
                page: page,
                data_per_page: smsPerPage,
                mem_store: 1,
                tags: 10,
                order_by: 'order by id desc',
            }
        )
        .then(res => {
            if(Array.isArray(res.messages))
                return res.messages.map(msg => {
                    msg.content = util.contentToString(msg.content);
                    msg.date = util.timeToDate(msg.date);
                    return msg;
                })
            return res;
        })
    }
    sendSMS(number, content){
        return this.goformSet(
            'SEND_SMS',
            {
                Number: number,
                sms_time: util.dateToTime(new Date(), ';'),
                MessageBody: util.stringToContent(content),
                ID: -1,
                encode_type: 'UNICODE',
            }
        )
    }
    deleteSMS(sms){
        return this.goformSet(
            'DELETE_SMS',
            {
                msg_id: Array.isArray(sms) ? sms.join(';') : sms,
            }
        )
    }

    // NETWORK RELATED
    connect(){
        return this.goformSet(
            'CONNECT_NETWORK',
            {
                notCallback: true,
            }
        )
    }
    disconnect(){
        return this.goformSet(
            'DISCONNECT_NETWORK',
            {
                notCallback: true,
            }
        )
    }

    // STATS RELATED
    getDevices(){
        return this.goformGetSingleData('station_list')
        .then(r => r.station_list)
    }
    getDeviceInfo(){
        return this.goformGetMultiData([
            'wifi_coverage','m_ssid_enable','imei','rssi',
            'imsi','cr_version','wa_version','hardware_version',
            'MAX_Access_num','SSID1','AuthMode','WPAPSK1_encode',
            'm_SSID','m_AuthMode','m_HideSSID','m_WPAPSK1_encode',
            'm_MAX_Access_num','lan_ipaddr','mac_address','msisdn',
            'LocalDomain','wan_ipaddr','static_wan_ipaddr','ipv6_wan_ipaddr',
            'ipv6_pdp_type','pdp_type','opms_wan_mode','ppp_status',
        ])
    }
    getData(){
        return this.goformGetMultiData([
            'modem_main_state','pin_status','opms_wan_mode','loginfo',
            'sms_received_flag','sts_received_flag','signalbar','network_type',
            'network_provider','ppp_status','EX_SSID1','ex_wifi_status',
            'EX_wifi_profile','m_ssid_enable','sms_unread_num','RadioOff',
            'simcard_roam','lan_ipaddr','station_mac','battery_charging',
            'battery_vol_percent','battery_pers','spn_name_data','spn_b1_flag',
            'spn_b2_flag','realtime_tx_bytes','realtime_rx_bytes','realtime_time',
            'realtime_tx_thrpt','realtime_rx_thrpt','monthly_rx_bytes','monthly_tx_bytes',
            'monthly_time','date_month','data_volume_limit_switch','data_volume_limit_size',
            'data_volume_alert_percent','data_volume_limit_unit','roam_setting_option',
            'ota_current_upgrade_state','ota_new_version_state',
        ])
    }
    getLogData(){
        return this.goformGetMultiData([
            'modem_main_state',
            'pin_status',
            'opms_wan_mode',
            'loginfo',
        ])
    }
    getPhonebook(page = 0, numbersPerPage = 500){
        return this.goformGet(
            {
                cmd: 'pbm_data_total',
                page: page,
                data_per_page: numbersPerPage,
                mem_store: 2,
                tags: 10,
                orderBy: 'name',
                isAsc: true,
            }
        )
        .then(res => {
            if(Array.isArray(res.pbm_data))
                return res.pbm_data.map(item => {
                    item.pbm_name = util.contentToString(item.pbm_name)
                    return item;
                })
            return res;
        })
    }
    getSMSData(){
        return this.goformGetSingleData('sms_capacity_info');
    }
    getWifiData(){
        return this.goformGetMultiData([
            'ACL_mode','wifi_mac_black_list',
            'wifi_hostname_black_list',
            'RadioOff','user_ip_addr',
        ])
    }

    // SETTINGS RELATED
    // - DEVICE SECTION
    // - - ACCOUNT MANAGEMENT SUBSECTION
    changePassword(oldPassword, newPassword){
        return this.goformSet(
            'CHANGE_PASSWORD',
            {
                newPassword: util.stringToBase64(newPassword),
                oldPassword: util.stringToBase64(oldPassword),
            }
        )
    }
    // - - DLNA SUBSECTION
    setDLNA(name,audio,video,image){
        return this.goformSet(
            'DLNA_SETTINGS',
            {
                dlna_language: 'english',
                dlna_name: name || 'ZTE_DLNA',
                dlna_share_audio: audio ? 'on' : 'off',
                dlna_share_video: video ? 'on' : 'off',
                dlna_share_image: image ? 'on' : 'off',
            }
        )
    }
    // - FIREWALL SECTION
    // - - PORT FILTERING SUBSECTION
    enablePortFiltering(enable, defaultPolicy){
        return this.goformSet(
            'BASIC_SETTING',
            {
                portFilterEnabled: Number(enable || 0),
                defaultFirewallPolicy: Number(defaultPolicy || 0),
            }
        )
    }
    addIPPortFilter(ipversion = 'ipv4', protocol = 'None'){
        return this.goformSet(
            'ADD_IP_PORT_FILETER_V4V6',
            {
                ip_version: ipversion,
                mac_address: '',
                dip_address: '',
                sip_address: '',
                dFromPort: 1,
                dToPort: 65535,
                sFromPort: 1,
                sToPort: 65535,
                action: Drop,
                protocol: protocol,
                comment: DEFAULT_COMMENT,
            }
        )
    }
    deleteIPPortFilter(id = '', idv6 = ''){
        return this.goformSet(
            'DEL_IP_PORT_FILETER_V4V6',
            {
                delete_id: Array.isArray(id) ? id.join(';') : id,
                delete_id_v6: Array.isArray(idv6) ? idv6.join(';') : idv6,
            }
        )
    }
    // - - PORT FORWARDING SUBSECTION
    enablePortForwarding(enable){
        return this.goformSet(
            'VIRTUAL_SERVER',
            {
                PortForwardEnable: Number(enable || 0),
            }
        )
    }
    addPortForward(address,portStart,portEnd,protocol = 'None'){
        return this.goformSet(
            'FW_FORWARD_ADD',
            {
                ipAddress: address,
                portStart: portStart,
                portEnd: portEnd,
                protocol: protocol,
                comment: DEFAULT_COMMENT,
            }
        )
    }
    deletePortForward(id){
        return this.goformSet(
            'FW_FORWARD_DEL',
            {
                delete_id: Array.isArray(id) ? id.join(';') : id,
            }
        )
    }
    // - - URL FILTERING SUBSECTION
    addURLFilter(url){
        return this.goformSet(
            'URL_FILTER_ADD',
            {
                addURLFilter: url,
            }
        )
    }
    deleteURLFilter(id){
        return this.goformSet(
            'URL_FILTER_DELETE',
            {
                url_filter_delete_id: Array.isArray(id) ? id.join(';') : id,
            }
        )
    }
    // - - UPNP SUBSECTION
    enableUPnP(enable){
        return this.goformSet(
            'UPNP_SETTING',
            {
                upnp_setting_option: Number(enable || 0),
            }
        )
    }
    // - - DMZ SUBSECTION
    enableDMZ(enable,ip){
        return this.goformSet(
            'DMZ_SETTING',
            {
                DMZEnabled: Number(enable || 0),
                DMZIPAddress: ip,
            }
        )
    }
}

module.exports = ZTECPE;
