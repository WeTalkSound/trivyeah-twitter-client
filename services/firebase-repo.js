class FirebaseRepo {
    constructor(dbRef) {
        this.dbRef = dbRef
    }

    first = () => {
        let result = null
        this.dbRef.on("value", async function (snapshot) {
            result = await snapshot.val()
        })
        return result
    }


}

module.exports = FirebaseRepo