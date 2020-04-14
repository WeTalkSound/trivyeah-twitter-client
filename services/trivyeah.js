const fetch = require("isomorphic-unfetch")
const querystring = require("querystring")

class Trivyeah {
    URL_SCHEME = "https://"
    BASE_API = "trivyeah-backend.wtxtra.agency/api/"

    constructor(config) {
        this.tenantSlug = config.tenantSlug
        this.tenantURL = this.bootstrap()
    }

    request = (endpoint = "", options) => {
        let url = (this.tenantURL ? this.tenantURL : this.BASE_API ) + endpoint

        let headers = {
            'Content-type': 'application/json'
        }

        let config = {
            ...headers,
            ...options
        }

        return fetch(url, config).then(r => {
            if (r.ok) {
                return r.json()
            }
            throw new Error(r)
        })
    }

    bootstrap = () => {
        let url = `bootstrap`

        let config = {
            method: "GET"
        }

        let base_api = this.request(url, config).then(data => data.base_url)
        
        return base_api
    }

    getForms = (options) => {
        let qs = options ? `?${querystring(options)}` : ''

        let url = `forms/list${qs}`

        let config = {
            method: "GET"
        }

        return this.request(url, config)
    }

    getForm = (formID) => {
        let url = `forms/view?id=${formID}`

        let config = {
            method: "GET"
        }

        return this.request(url, config)
    }


}

module.exports = Trivyeah