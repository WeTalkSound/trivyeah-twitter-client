const fetch = require("isomorphic-unfetch")
const querystring = require("querystring")


class Trivyeah {
    constructor(config) {
    }
    
    static request (endpoint = "", options) {
        let url = (Trivyeah.tenantURL ? Trivyeah.tenantURL + Trivyeah.API_ENDPOINT : Trivyeah.URL_SCHEME + Trivyeah.BASE_URL + Trivyeah.API_ENDPOINT ) + endpoint
        
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

    static bootstrap () {
        let qs = `?email=${Trivyeah.tenantSlug}`
        let url = `bootstrap${qs}`

        let config = {
            method: "GET"
        }

        return Trivyeah.request(url, config).then(response => response.data.base_url).catch(err => console.log(err))
    }

    getForms (options) {
        let qs = options ? `?${querystring(options)}` : ''

        let url = `forms/list${qs}`

        let config = {
            method: "GET"
        }

        return Trivyeah.request(url, config)
    }

    getForm (formID) {
        let url = `forms/view?id=${formID}`

        let config = {
            method: "GET"
        }

        return Trivyeah.request(url, config)
    }


}

Trivyeah.URL_SCHEME = "https://"
Trivyeah.BASE_URL = "trivyeah-backend.wtxtra.agency/"
Trivyeah.API_ENDPOINT = "api/v1/"
Trivyeah.tenantSlug = config.tenantSlug
Trivyeah.bootstrap().then(url => {
    console.log("Here?")
    console.log(url)
    Trivyeah.tenantURL = url
}).catch(err => {
    console.log(err)
})

module.exports = Trivyeah