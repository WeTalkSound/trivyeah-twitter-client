const fetch = require("isomorphic-unfetch")
const querystring = require("querystring")

class Trivyeah {
    constructor(config) {
        this.tenantSlug = config.tenantSlug
        this.tenantURL = this.bootstrap()
    }
    
    URL_SCHEME = "http://"
    BASE_API = "trivyeah-backend.wtxtra.agency/api/v1/"
    
    request = (endpoint = "", options) => {
        let url = this.URL_SCHEME + (this.tenantURL ? this.tenantURL : this.BASE_API ) + endpoint

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
            throw new Error(r.statusText)
        })
    }

    bootstrap = () => {
        let qs = `?email=${this.tenantSlug}`
        let url = `bootstrap${qs}`

        let config = {
            method: "GET"
        }

        let base_api = this.request(url, config).then(data => data.base_url).catch(err => console.log(err))
        
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