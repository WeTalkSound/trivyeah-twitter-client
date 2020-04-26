const fetch = require("isomorphic-unfetch")
const querystring = require("querystring")

class Trivyeah {
    constructor(config) {
        Trivyeah.URL_SCHEME = "https://"
        Trivyeah.BASE_URL = "trivyeah-backend.wtxtra.agency/"
        Trivyeah.API_ENDPOINT = "api/v1/"
        Trivyeah.tenantSlug = config.tenantSlug
        while (! Trivyeah.tenantURL) {
            this.bootstrap().then(url => {
                console.log(url)
                Trivyeah.tenantURL = url
            })
        }
    }
    
    request (endpoint = "", options) {
        let url = (this.tenantURL ? this.tenantURL + this.API_ENDPOINT : this.URL_SCHEME + this.BASE_URL + this.API_ENDPOINT ) + endpoint

        let headers = {
            'Content-type': 'application/json'
        }

        let config = Object.assign({}, headers, options)

        return fetch(url, config).then(r => {
            if (r.ok) {
                return r.json()
            }
            throw new Error(r.statusText)
        })
    }

    bootstrap () {
        let qs = `?email=${this.tenantSlug}`
        let url = `bootstrap${qs}`

        let config = {
            method: "GET"
        }

        return this.request(url, config).then(response => response.data.base_url).catch(err => console.log(err))
    }

    getForms (options) {
        let qs = options ? `?${querystring(options)}` : ''

        let url = `forms/list${qs}`

        let config = {
            method: "GET"
        }

        return this.request(url, config)
    }

    getForm (formID) {
        let url = `forms/view?id=${formID}`

        let config = {
            method: "GET"
        }

        return this.request(url, config)
    }


}

module.exports = Trivyeah