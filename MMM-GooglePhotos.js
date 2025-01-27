//
// MMM-GooglePhotos
//
Module.register("MMM-GooglePhotos", {
  defaults: {
    albums: [],
    updateInterval: 1000 * 30, // minimum 10 seconds.
    sort: "new", // "old", "random"
    uploadAlbum: null, // Only for created by `create_uploadable_album.js`
    condition: {
      fromDate: null, // Or "2018-03", RFC ... format available
      toDate: null, // Or "2019-12-25",
      minWidth: null, // Or 400
      maxWidth: null, // Or 8000
      minHeight: null, // Or 400
      maxHeight: null, // Or 8000
      minWHRatio: null,
      maxWHRatio: null,
      // WHRatio = Width/Height ratio ( ==1 : Squared Photo,   < 1 : Portraited Photo, > 1 : Landscaped Photo)
    },
    showWidth: 1080, // These values will be used for quality of downloaded photos to show. real size to show in your MagicMirror region is recommended.
    showHeight: 1920,
    timeFormat: "YYYY/MM/DD HH:mm",
    autoInfoPosition: false,
  },

  getStyles: function() {
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " getStyles")
    return ["MMM-GooglePhotos.css"]
  },

  start: function() {
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " start")
    this.uploadableAlbum = null
    this.albums = null
    this.scanned = []
    this.updateTimer = null
    this.index = 0
    this.needMorePicsFlag = true
    this.firstScan = true
    if (this.config.updateInterval < 1000 * 10) this.config.updateInterval = 1000 * 10
    this.config.condition = Object.assign({}, this.defaults.condition, this.config.condition)
    this.sendSocketNotification("INIT", this.config)
    this.dynamicPosition = 0
    
  },

  socketNotificationReceived: function(noti, payload) {
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " socketNotificationReceived " + noti)
    if (noti == "UPLOADABLE_ALBUM") {
      this.uploadableAlbum = payload
    }
    if (noti == "INITIALIZED") {
      this.albums = payload
      //set up timer once initialized, more robust against faults
      this.updateTimer = setInterval(()=>{
        this.updatePhotos()
      }, this.config.updateInterval)
    }
    if (noti == "MORE_PICS") {
      if (payload && Array.isArray(payload) && payload.length > 0)
      this.needMorePicsFlag = false
      this.scanned = payload
      this.index = 0
      if (this.firstScan) {
        this.updatePhotos() //little faster starting
      }
    }
  },

  notificationReceived: function(noti, payload, sender) {
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " notificationReceived " + noti)
    if (noti == "GPHOTO_NEXT") {
      this.updatePhotos()
    }
    if (noti == "GPHOTO_PREVIOUS") {
      this.updatePhotos(-2)
    }
    if (noti == "GPHOTO_UPLOAD") {
      this.sendSocketNotification("UPLOAD", payload)
    }
  },

  updatePhotos: function(dir=0) {
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " updatePhotos")
    this.firstScan == false
    
    if (this.scanned.length == 0) {
      this.sendSocketNotification("NEED_MORE_PICS", [])
      return
    }
    this.index = this.index + dir //only used for reversing
    if (this.index < 0) this.index = 0
    if (this.index >= this.scanned.length) {
      this.index = 0
    }
    var target = this.scanned[this.index]
    var url = target.baseUrl + `=w${this.config.showWidth}-h${this.config.showHeight}`
    this.ready(url, target)
    this.index++
    if (this.index >= this.scanned.length) {
      this.index = 0
      this.needMorePicsFlag = true
    }
    if (this.needMorePicsFlag) {
      this.sendSocketNotification("NEED_MORE_PICS", [])
    }
  },

  formatDate: function(dateString) {
    var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
    var date = new Date(dateString);
    return monthNames[date.getMonth()] + " " + date.getFullYear();
  },

  ready: function(url, target) {
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " ready")
    var hidden = document.createElement("img")
    hidden.onerror = () => {
      console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " [GPHOTO] Image load fails.")
      this.sendSocketNotification("IMAGE_LOAD_FAIL", url)
    }
    hidden.onload = () => {
      var back = document.getElementById("GPHOTO_BACK")
      var current = document.getElementById("GPHOTO_CURRENT")
      //current.classList.remove("animated")
      var dom = document.getElementById("GPHOTO")
      back.style.backgroundImage = `url(${url})`
      current.style.backgroundImage = `url(${url})`
      current.classList.add("animated")
      var info = document.getElementById("GPHOTO_INFO")
      var album = this.albums.find((a)=>{
        if (a.id == target._albumId) return true
        return false
      })
      if (this.config.autoInfoPosition) {
        var op = (album, target) => {
          var now = new Date()
          var q = Math.floor(now.getMinutes() / 15)
          var r = [
            [0,       'none',   'none',   0     ],
            ['none',  'none',   0,        0     ],
            ['none',  0,        0,        'none'],
            [0,       0,        'none',   'none'],
          ]
          return r[q]
        }
        if (typeof this.config.autoInfoPosition == 'function') {
          op = this.config.autoInfoPosition
        }
        let [top, left, bottom, right] = op(album, target)
        info.style.setProperty('--top', top)
        info.style.setProperty('--left', left)
        info.style.setProperty('--bottom', bottom)
        info.style.setProperty('--right', right)
      }
      info.innerHTML = ""
      var infoText = document.createElement("div")
      infoText.classList.add("infoText")

      if (target.description !== undefined) {
        var description = document.createElement("div")
        description.classList.add("description")
        description.innerHTML = target.description
        infoText.appendChild(description)
      }
      var photoTime = document.createElement("div")
      photoTime.classList.add("photoTime")
      photoTime.innerHTML = this.formatDate(target.mediaMetadata.creationTime)
      infoText.appendChild(photoTime)

      info.appendChild(infoText)

      console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " [GPHOTO] Image loaded:", url)
      this.sendSocketNotification("IMAGE_LOADED", url)
    }
    hidden.src = url
  },


  getDom: function() {
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " getDom")
    var wrapper = document.createElement("div")
    wrapper.id = "GPHOTO"
    var back = document.createElement("div")
    back.id = "GPHOTO_BACK"
    var current = document.createElement("div")
    current.id = "GPHOTO_CURRENT"
    if (this.data.position.search("fullscreen") == -1) {
      if (this.config.showWidth) wrapper.style.width = this.config.showWidth + "px"
      if (this.config.showHeight) wrapper.style.height = this.config.showHeight + "px"
    }
    current.addEventListener('animationend', ()=>{
      current.classList.remove("animated")
    })
    var info = document.createElement("div")
    info.id = "GPHOTO_INFO"
    info.innerHTML = "Loading..."
    wrapper.appendChild(back)
    wrapper.appendChild(current)
    wrapper.appendChild(info)
    console.log("T: " + new Date().getMinutes() + ":" + new Date().getSeconds() + " updated!")
    return wrapper
  },
})
