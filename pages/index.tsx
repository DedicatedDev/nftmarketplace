import { ethers } from 'ethers'
import {useEffect,useState} from 'react'
import type { NextPage } from 'next'
import styles from '../styles/Home.module.css'
import axios from 'axios'
import Web3Modal from 'web3modal'
import NFTContract from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'
import * as dotenv from "dotenv";
import { nftaddress, nftmarketaddress,rinkebyApiKey,rinkebyId } from '../config'
import { NFTMarket } from '../typechain/NFTMarket'
import { NFT } from '../typechain/NFT'



const Home: NextPage = () => {
  const [nfts, setNFts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  useEffect(() => {
    loadNFTs()
  },[])

  const loadNFTs = async() => {
    //const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/6c493c0e906c44cba79597ca3220c865')
    const provider = new ethers.providers.InfuraProvider("rinkeby",rinkebyId)
    console.log(nftaddress)
    const tokenContract = new ethers.Contract(nftaddress, NFTContract.abi, provider) as NFT
    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, provider) as NFTMarket
    const data = await marketContract.fetchMarketItems()
    const items = await Promise.all(data.map(async i => {
      const tokenUri = await tokenContract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      let item = {
        price,
        itemId: i.itemId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description
      }
      return item
    }))

    setNFts(items)
    setLoadingState('loaded')
  }

  const buyNFT = async(nft) => {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)

    const signer = provider.getSigner()
    const contract = new ethers.Contract(nftmarketaddress, Market.abi, signer) as NFTMarket
    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether')
    const transaction = await contract.createMarketSale(nftaddress,nft.itemId,{
      value: price
    })
    await transaction.wait()
    loadNFTs()
  }

  if(loadingState === 'loaded' && !nfts.length) return (<h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>)

  return (
    <div className="flex justify-center">
      <div className="py-10" style={{maxWidth: '1600px'}}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {
            nfts.map((nft,i) => (
              <div>
                <div key={i} className="border shadow rounded-xl overflow-hidden">
                  <img src={nft.image} />
                  <div className="p-4">
                    <p style={{height: '64px'}} className="text-2xl font-semibold">{nft.name}</p>
                    <div style={{height:'70px', overflow:'hidden'}}>
                      <p className="text-gray-400">{nft.description}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-black">
                    <p className="text-2xl mb-4 font-bold text-white">{nft.price} ETH</p>
                    <button className="w-full bg-pink-500 text-white font-bold py-2 px-12 rounded" onClick={()=>buyNFT(nft)}>Buy</button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

export default Home
