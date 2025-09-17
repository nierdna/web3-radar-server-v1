import { CRYPTORANK_ICO_URL } from '../../lib/config/url'
import { axiosClient } from '../../lib/config/axios'

export class ICOListExtractor {
  static async extractKeys(): Promise<string[]> {
    const res = await axiosClient.post(CRYPTORANK_ICO_URL)
    const data = res.data
    const list: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
    const keys = list.map(it => it?.key || it?.coinKey || it?.slug || '').filter(Boolean)
    return Array.from(new Set(keys))
  }
}
