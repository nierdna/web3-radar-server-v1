import axios from 'axios'

const axiosClient = axios.create({
  timeout: 20000,
  headers: {
    Accept: 'application/json'
  }
})

export { axiosClient }

