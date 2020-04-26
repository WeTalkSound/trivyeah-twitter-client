const fetch = require("isomorphic-unfetch")
const querystring = require("querystring")
class Bootstraper{}

Bootstraper.init = async (config) => {
    Bootstraper.URL_SCHEME = "https://"
    Bootstraper.BASE_URL = "trivyeah-backend.wtxtra.agency/"
    Bootstraper.API_ENDPOINT = "api/v1/"
    Bootstraper.tenantSlug = config.tenantSlug
    let qs = `?email=${this.tenantSlug}`
    let url = `bootstrap${qs}`
    let config = {
        method: "GET"
    }
    Bootstraper.tenantURL = await Bootstraper.request(url, config).then(response => response.data.base_url).catch(err => console.log(err))
}
Bootstraper.request = (endpoint = "", options) => {
    let url = (Bootstraper.tenantURL ? Bootstraper.tenantURL + Bootstraper.API_ENDPOINT : Bootstraper.URL_SCHEME + Bootstraper.BASE_URL + Bootstraper.API_ENDPOINT ) + endpoint

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

class Trivyeah {

    getForms (options) {
        let qs = options ? `?${querystring(options)}` : ''

        let url = `forms/list${qs}`

        let config = {
            method: "GET"
        }

        return Bootstraper.request(url, config)
    }

    getForm (formID) {
        let url = `forms/view?id=${formID}`

        let config = {
            method: "GET"
        }
        
        return Bootstraper.request(url, config)
    }


}

module.exports = Trivyeah


// Bootstraper.init({xyx: 'ooeoeei'});
// const TrivyeahObj = new Trivyeah();
// Trivyeah.getForm(1)
