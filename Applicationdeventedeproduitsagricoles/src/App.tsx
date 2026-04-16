import { useMemo, useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, addDoc, setDoc, getDocs, getDoc, doc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore'
import { auth, db, requestNotificationPermission, onMessageListener } from './firebase'
import './App.css'

type Product = {
  id: number
  name: string
  category: string
  price: number
  unit: string
  image: string
  sellerId?: string
  sellerName?: string
  location?: string
  rating?: number
  reviews?: number
  description?: string
  stock?: number
  isOrganic?: boolean
  harvestDate?: string
}

type Favorite = {
  id?: string
  userId: string
  productId: number
  dateAdded: string
}

type Order = {
  id: string
  userId: string
  items: Array<{ productId: string; quantity: number; price: number }>
  total: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
  date: string
  paymentMethod: string
  deliveryAddress: string
}

type Notification = {
  id: string
  userId: string
  type: 'order' | 'review' | 'message' | 'promotion'
  title: string
  message: string
  date: string
  read: boolean
}

type AppUser = {
  uid: string
  email: string | null
  role: 'user' | 'seller'
  loggedIn: boolean
}

type Seller = {
  id: string
  name: string
  location: string
  bio: string
}

const sellers: Seller[] = [
  { id: 'sanfo', name: 'Sanfo', location: 'Bamako, Mali', bio: 'Producteur de produits agricoles de qualité' },
  { id: 'seller1', name: 'Pankoro Abdoulye', location: 'Bamako, Mali', bio: 'Producteur de mangues et légumes locaux' },
  { id: 'seller2', name: 'Ibrahim Traore', location: 'Sikasso, Mali', bio: 'Spécialiste des céréales biologiques' },
  { id: 'seller3', name: 'Sirafing Keita', location: 'Ségou, Mali', bio: 'Légumes de saison et plantains' },
  { id: 'seller4', name: 'Nafissatou Abdoulaye', location: 'Mopti, Mali', bio: 'Herbes fraîches et épices traditionnelles' },
  { id: 'seller5', name: 'Daouda', location: 'Kayes, Mali', bio: 'Fruits exotiques et produits de maraîchage' },
  { id: 'seller6', name: 'Fagnon', location: 'Mopti, Mali', bio: 'Primeurs locaux et huiles terre-tienne' },
  { id: 'seller7', name: 'Ibrahim Coulibaly', location: 'Tombouctou, Mali', bio: 'Riz de haute qualité et sucreries traditionnelles' },
  { id: 'seller8', name: 'Seydou Diallo', location: 'Gao, Mali', bio: 'Légumes secs et épices artisanales' }
]

const products: Product[] = [
  { id: 1, name: 'Tomate', category: 'Légumes', price: 1200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Tomate' },
  { id: 2, name: 'Banane', category: 'Fruits', price: 1000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Banane' },
  { id: 3, name: 'Carotte', category: 'Légumes', price: 800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Carotte' },
  { id: 4, name: 'Avocat', category: 'Fruits', price: 2500, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Avocat' },
  { id: 5, name: 'Pommes de terre', category: 'Légumes', price: 600, unit: 'kg', image: 'https://via.placeholder.com/120?text=Patate' },
  { id: 6, name: 'Ananas', category: 'Fruits', price: 2200, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Ananas' },
  { id: 7, name: 'Maïs', category: 'Céréales', price: 500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Maïs' },
  { id: 8, name: 'Mil', category: 'Céréales', price: 700, unit: 'kg', image: 'https://via.placeholder.com/120?text=Mil' },
  { id: 9, name: 'Sorgho', category: 'Céréales', price: 650, unit: 'kg', image: 'https://via.placeholder.com/120?text=Sorgho' },
  { id: 10, name: 'Jus de bissap', category: 'Boissons', price: 1500, unit: 'litre', image: 'https://via.placeholder.com/120?text=Bissap' },
  // Fruits supplémentaires
  { id: 11, name: 'Orange', category: 'Fruits', price: 800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Orange' },
  { id: 12, name: 'Pomme', category: 'Fruits', price: 1500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Pomme' },
  { id: 13, name: 'Mangue', category: 'Fruits', price: 2000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Mangue' },
  { id: 14, name: 'Papaye', category: 'Fruits', price: 1800, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Papaye' },
  { id: 15, name: 'Citron', category: 'Fruits', price: 1200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Citron' },
  { id: 16, name: 'Pastèque', category: 'Fruits', price: 300, unit: 'kg', image: 'https://via.placeholder.com/120?text=Pastèque' },
  { id: 17, name: 'Melon', category: 'Fruits', price: 2500, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Melon' },
  { id: 18, name: 'Poire', category: 'Fruits', price: 1800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Poire' },
  { id: 19, name: 'Pêche', category: 'Fruits', price: 2200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Pêche' },
  { id: 20, name: 'Abricot', category: 'Fruits', price: 2500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Abricot' },
  { id: 101, name: 'Tomates Sanfo', category: 'Légumes', price: 1600, unit: 'kg', image: 'https://via.placeholder.com/120?text=Tomates+Sanfo', sellerId: 'sanfo', sellerName: 'Sanfo' },
  { id: 102, name: 'Mangue Sanfo', category: 'Fruits', price: 2100, unit: 'kg', image: 'https://via.placeholder.com/120?text=Mangue+Sanfo', sellerId: 'sanfo', sellerName: 'Sanfo' },
  { id: 103, name: 'Riz Sanfo', category: 'Céréales', price: 950, unit: 'kg', image: 'https://via.placeholder.com/120?text=Riz+Sanfo', sellerId: 'sanfo', sellerName: 'Sanfo' },
  { id: 104, name: 'Huile Sanfo', category: 'Boissons', price: 2600, unit: 'litre', image: 'https://via.placeholder.com/120?text=Huile+Sanfo', sellerId: 'sanfo', sellerName: 'Sanfo' },
  { id: 105, name: 'Carottes Sanfo', category: 'Légumes', price: 1050, unit: 'kg', image: 'https://via.placeholder.com/120?text=Carottes+Sanfo', sellerId: 'sanfo', sellerName: 'Sanfo' },
  { id: 21, name: 'Cerise', category: 'Fruits', price: 3500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Cerise' },
  { id: 22, name: 'Fraise', category: 'Fruits', price: 4000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Fraise' },
  { id: 23, name: 'Framboise', category: 'Fruits', price: 5000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Framboise' },
  { id: 24, name: 'Myrtille', category: 'Fruits', price: 4500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Myrtille' },
  { id: 25, name: 'Kiwi', category: 'Fruits', price: 2800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Kiwi' },
  { id: 26, name: 'Grenade', category: 'Fruits', price: 3200, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Grenade' },
  { id: 27, name: 'Kaki', category: 'Fruits', price: 2600, unit: 'kg', image: 'https://via.placeholder.com/120?text=Kaki' },
  { id: 28, name: 'Litchi', category: 'Fruits', price: 3800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Litchi' },
  { id: 29, name: 'Raisin', category: 'Fruits', price: 1600, unit: 'kg', image: 'https://via.placeholder.com/120?text=Raisin' },
  { id: 30, name: 'Figue', category: 'Fruits', price: 3000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Figue' },
  // Légumes supplémentaires
  { id: 31, name: 'Oignon', category: 'Légumes', price: 400, unit: 'kg', image: 'https://via.placeholder.com/120?text=Oignon' },
  { id: 32, name: 'Ail', category: 'Légumes', price: 2000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Ail' },
  { id: 33, name: 'Poivron', category: 'Légumes', price: 1800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Poivron' },
  { id: 34, name: 'Concombre', category: 'Légumes', price: 600, unit: 'kg', image: 'https://via.placeholder.com/120?text=Concombre' },
  { id: 35, name: 'Courgette', category: 'Légumes', price: 900, unit: 'kg', image: 'https://via.placeholder.com/120?text=Courgette' },
  { id: 36, name: 'Aubergine', category: 'Légumes', price: 1200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Aubergine' },
  { id: 37, name: 'Brocoli', category: 'Légumes', price: 2200, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Brocoli' },
  { id: 38, name: 'Chou', category: 'Légumes', price: 800, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Chou' },
  { id: 39, name: 'Épinard', category: 'Légumes', price: 1500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Épinard' },
  { id: 40, name: 'Laitue', category: 'Légumes', price: 1000, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Laitue' },
  { id: 41, name: 'Radis', category: 'Légumes', price: 700, unit: 'kg', image: 'https://via.placeholder.com/120?text=Radis' },
  { id: 42, name: 'Navet', category: 'Légumes', price: 500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Navet' },
  { id: 43, name: 'Betterave', category: 'Légumes', price: 900, unit: 'kg', image: 'https://via.placeholder.com/120?text=Betterave' },
  { id: 44, name: 'Céleri', category: 'Légumes', price: 1300, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Céleri' },
  { id: 45, name: 'Poireau', category: 'Légumes', price: 1100, unit: 'kg', image: 'https://via.placeholder.com/120?text=Poireau' },
  { id: 46, name: 'Fenouil', category: 'Légumes', price: 1600, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Fenouil' },
  { id: 47, name: 'Artichaut', category: 'Légumes', price: 2500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Artichaut' },
  { id: 48, name: 'Asperge', category: 'Légumes', price: 4000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Asperge' },
  { id: 49, name: 'Haricot vert', category: 'Légumes', price: 1400, unit: 'kg', image: 'https://via.placeholder.com/120?text=Haricot' },
  { id: 50, name: 'Pois', category: 'Légumes', price: 1200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Pois' },
  // Céréales supplémentaires
  { id: 51, name: 'Riz', category: 'Céréales', price: 800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Riz' },
  { id: 52, name: 'Blé', category: 'Céréales', price: 600, unit: 'kg', image: 'https://via.placeholder.com/120?text=Blé' },
  { id: 53, name: 'Orge', category: 'Céréales', price: 550, unit: 'kg', image: 'https://via.placeholder.com/120?text=Orge' },
  { id: 54, name: 'Avoine', category: 'Céréales', price: 700, unit: 'kg', image: 'https://via.placeholder.com/120?text=Avoine' },
  { id: 55, name: 'Seigle', category: 'Céréales', price: 650, unit: 'kg', image: 'https://via.placeholder.com/120?text=Seigle' },
  { id: 56, name: 'Quinoa', category: 'Céréales', price: 3000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Quinoa' },
  { id: 57, name: 'Sarrasin', category: 'Céréales', price: 1800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Sarrasin' },
  { id: 58, name: 'Épeautre', category: 'Céréales', price: 2500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Épeautre' },
  { id: 59, name: 'Amarante', category: 'Céréales', price: 3500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Amarante' },
  { id: 60, name: 'Teff', category: 'Céréales', price: 4000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Teff' },
  // Boissons supplémentaires
  { id: 61, name: 'Jus d\'orange', category: 'Boissons', price: 2000, unit: 'litre', image: 'https://via.placeholder.com/120?text=Jus+Orange' },
  { id: 62, name: 'Jus de mangue', category: 'Boissons', price: 2500, unit: 'litre', image: 'https://via.placeholder.com/120?text=Jus+Mangue' },
  { id: 63, name: 'Jus de goyave', category: 'Boissons', price: 2200, unit: 'litre', image: 'https://via.placeholder.com/120?text=Jus+Goyave' },
  { id: 64, name: 'Jus de tamarin', category: 'Boissons', price: 1800, unit: 'litre', image: 'https://via.placeholder.com/120?text=Jus+Tamarin' },
  { id: 65, name: 'Lait de coco', category: 'Boissons', price: 1500, unit: 'litre', image: 'https://via.placeholder.com/120?text=Lait+Coco' },
  { id: 66, name: 'Eau de coco', category: 'Boissons', price: 1200, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Eau+Coco' },
  { id: 67, name: 'Thé vert', category: 'Boissons', price: 3000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Thé+Vert' },
  { id: 68, name: 'Café', category: 'Boissons', price: 4000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Café' },
  { id: 69, name: 'Vin de palme', category: 'Boissons', price: 1000, unit: 'litre', image: 'https://via.placeholder.com/120?text=Vin+Palme' },
  { id: 70, name: 'Bière de mil', category: 'Boissons', price: 800, unit: 'litre', image: 'https://via.placeholder.com/120?text=Bière+Mil' },
  // Plus de légumes
  { id: 81, name: 'Champignon', category: 'Légumes', price: 3000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Champignon' },
  { id: 82, name: 'Tomate cerise', category: 'Légumes', price: 2000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Tomate+Cerise' },
  { id: 83, name: 'Poivron rouge', category: 'Légumes', price: 2200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Poivron+Rouge' },
  { id: 84, name: 'Poivron jaune', category: 'Légumes', price: 2300, unit: 'kg', image: 'https://via.placeholder.com/120?text=Poivron+Jaune' },
  { id: 85, name: 'Chou-fleur', category: 'Légumes', price: 1500, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Chou+Fleur' },
  { id: 86, name: 'Chou de Bruxelles', category: 'Légumes', price: 2500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Chou+Bruxelles' },
  { id: 87, name: 'Endive', category: 'Légumes', price: 1200, unit: 'pièce', image: 'https://via.placeholder.com/120?text=Endive' },
  { id: 88, name: 'Mâche', category: 'Légumes', price: 3500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Mâche' },
  { id: 89, name: 'Roquette', category: 'Légumes', price: 2800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Roquette' },
  { id: 90, name: 'Persil', category: 'Légumes', price: 1000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Persil' },
  { id: 91, name: 'Coriandre', category: 'Légumes', price: 1200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Coriandre' },
  { id: 92, name: 'Basilic', category: 'Légumes', price: 1500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Basilic' },
  { id: 93, name: 'Menthe', category: 'Légumes', price: 800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Menthe' },
  { id: 94, name: 'Thym', category: 'Légumes', price: 2000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Thym' },
  { id: 95, name: 'Romarin', category: 'Légumes', price: 1800, unit: 'kg', image: 'https://via.placeholder.com/120?text=Romarin' },
  { id: 96, name: 'Sauge', category: 'Légumes', price: 2200, unit: 'kg', image: 'https://via.placeholder.com/120?text=Sauge' },
  { id: 97, name: 'Laurier', category: 'Légumes', price: 2500, unit: 'kg', image: 'https://via.placeholder.com/120?text=Laurier' },
  { id: 98, name: 'Estragon', category: 'Légumes', price: 3000, unit: 'kg', image: 'https://via.placeholder.com/120?text=Estragon' },
  { id: 99, name: 'Aneth', category: 'Légumes', price: 2700, unit: 'kg', image: 'https://via.placeholder.com/120?text=Aneth' },
  { id: 100, name: 'Ciboulette', category: 'Légumes', price: 2400, unit: 'kg', image: 'https://via.placeholder.com/120?text=Ciboulette' },
]

const productsWithSeller: Product[] = products.map((product, index) => {
  const sellerIndex = Math.floor(index / 10) % sellers.length
  const seller = sellers[sellerIndex]
  return {
    ...product,
    sellerId: product.sellerId || seller.id,
    sellerName: product.sellerName || seller.name,
    location: product.location || seller.location
  }
})

const categories = ['Toutes', 'Fruits', 'Légumes', 'Céréales', 'Boissons']

const getProductImage = (name: string, fallback: string) => {
  // Utilise Unsplash pour des images réelles de produits agricoles, sinon fallback
  const encodedName = encodeURIComponent(name.replace(/\s+/g, '+'))
  return `https://source.unsplash.com/featured/400x300?${encodedName}` || fallback
}

const isValidPhone = (phone: string) => /^\d{8,15}$/.test(phone)
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const isStrongPassword = (password: string) => password.length >= 6

const simulateOrangeMoney = (_amount: number, _phone: string) => {
  return new Promise<{ success: boolean; reference: string }>((resolve) => {
    setTimeout(() => resolve({ success: true, reference: 'OM' + Date.now() }), 1300)
  })
}

const simulateWavePayment = (_amount: number, _phone: string) => {
  return new Promise<{ success: boolean; reference: string }>((resolve) => {
    setTimeout(() => resolve({ success: true, reference: 'WAVE' + Date.now() }), 1300)
  })
}

const simulateMoveMoney = (_amount: number, _phone: string) => {
  return new Promise<{ success: boolean; reference: string }>((resolve) => {
    setTimeout(() => resolve({ success: true, reference: 'MOVE' + Date.now() }), 1300)
  })
}

function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="hero-content">
          <div className="hero-logo">
            <span className="logo-icon">🌾</span>
          </div>
          <h1 className="hero-title">DUGU-SUGU</h1>
          <p className="hero-subtitle">Produits frais du producteur au consommateur</p>
          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">🚚</span>
              <span>Livraison rapide</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🌱</span>
              <span>Produits bio & locaux</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💳</span>
              <span>Paiement sécurisé</span>
            </div>
          </div>
          <button className="hero-cta" onClick={() => navigate('/login')}>
            Commencer l'aventure
            <span className="cta-arrow">→</span>
          </button>
        </div>
        <div className="hero-image">
          <div className="floating-elements">
            <div className="floating-item item-1">🥭</div>
            <div className="floating-item item-2">🌽</div>
            <div className="floating-item item-3">🥕</div>
            <div className="floating-item item-4">🍅</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Home({ cart, addToCart, sellerProducts, currentUser }: { cart: Record<string, number>; addToCart: (id: string) => void; sellerProducts: Array<any>; currentUser: AppUser | null }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Toutes')
  const [activeSellerId, setActiveSellerId] = useState('Toutes')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [userLocation, setUserLocation] = useState('')
  const [showOnlyOrganic, setShowOnlyOrganic] = useState(false)
  const productsPerPage = 12

  const allProducts = useMemo(() => {
    return [...productsWithSeller, ...sellerProducts]
  }, [sellerProducts])

  // Charger les favoris de l'utilisateur
  useEffect(() => {
    const loadFavorites = async () => {
      if (currentUser?.uid) {
        try {
          const favoritesQuery = query(collection(db, 'favorites'), where('userId', '==', currentUser.uid))
          const snapshot = await getDocs(favoritesQuery)
          const userFavorites = snapshot.docs.map(doc => ({ ...doc.data() } as Favorite))
          setFavorites(userFavorites)
        } catch (error) {
          console.error('Erreur chargement favoris:', error)
        }
      }
    }
    loadFavorites()
  }, [currentUser])

  const toggleFavorite = async (productId: string) => {
    if (!currentUser?.uid) return

    const existingFavorite = favorites.find(f => f.productId === parseInt(productId))

    try {
      if (existingFavorite) {
        // Retirer des favoris
        await deleteDoc(doc(db, 'favorites', existingFavorite.id || ''))
        setFavorites(favorites.filter(f => f.productId !== parseInt(productId)))
      } else {
        // Ajouter aux favoris
        const newFavorite: Favorite = {
          userId: currentUser.uid,
          productId: parseInt(productId),
          dateAdded: new Date().toISOString()
        }
        const docRef = await addDoc(collection(db, 'favorites'), newFavorite)
        setFavorites([...favorites, { ...newFavorite, id: docRef.id }])
      }
    } catch (error) {
      console.error('Erreur gestion favoris:', error)
    }
  }

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = allProducts.filter((item) => {
      const matchesCategory = activeCategory === 'Toutes' || item.category === activeCategory
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1]
      const matchesOrganic = !showOnlyOrganic || item.isOrganic
      const matchesLocation = !userLocation || item.location?.toLowerCase().includes(userLocation.toLowerCase())
      const matchesSeller = activeSellerId === 'Toutes' || item.sellerId === activeSellerId

      return matchesCategory && matchesSearch && matchesPrice && matchesOrganic && matchesLocation && matchesSeller
    })

    // Tri des produits
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return filtered
  }, [activeCategory, searchQuery, sortBy, priceRange, showOnlyOrganic, userLocation, allProducts])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / productsPerPage)
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  )

  const isFavorite = (productId: string) => favorites.some(f => f.productId === parseInt(productId))

  return (
    <>
      <header className="top-header">
        <div>
          <h1>DUGU-SUGU</h1>
          <p>Produits frais du producteur au consommateur</p>
        </div>
        <div className="header-actions">
          <button
            className="nav-btn"
            onClick={() => navigate('/sellers')}
            title="Voir nos producteurs"
          >
            👥 Producteurs
          </button>
          <div className="badge-cart">
            <span className="cart-icon">🛒</span>
            <span className="cart-count">{Object.keys(cart).length}</span>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-image">
          <div className="hero-overlay">
            <h2>� Découvrez l'Excellence Agricole Malienne</h2>
            <p>Connectez-vous aux meilleurs producteurs locaux et savourez des produits frais, authentiques et durables</p>
          </div>
        </div>
        <div className="hero-text">
          <h2>De la Terre à Votre Table, Instantanément</h2>
          <p>DUGU-SUGU révolutionne l'agriculture malienne en connectant directement producteurs passionnés et consommateurs exigeants. Qualité, fraîcheur et authenticité garanties.</p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{sellers.length}</span>
              <span className="stat-label">Producteurs Passionnés</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{allProducts.length}</span>
              <span className="stat-label">Produits d'Exception</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24h</span>
              <span className="stat-label">Livraison</span>
            </div>
          </div>
        </div>
      </section>

      <section className="filter-row">
        <div className="search-container">
          <input
            type="search"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 Filtres
          </button>
        </div>

        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-group">
              <label>Trier par:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Nom</option>
                <option value="price-low">Prix croissant</option>
                <option value="price-high">Prix décroissant</option>
                <option value="rating">Note</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Prix (FCFA):</label>
              <div className="price-range">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Localisation:</label>
              <input
                type="text"
                placeholder="Ville ou région"
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Vendeur :</label>
              <select value={activeSellerId} onChange={(e) => setActiveSellerId(e.target.value)}>
                <option value="Toutes">Toutes</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>{seller.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={showOnlyOrganic}
                  onChange={(e) => setShowOnlyOrganic(e.target.checked)}
                />
                Bio uniquement
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="categories">
        {categories.map((cat) => (
          <button key={cat} className={cat === activeCategory ? 'category active' : 'category'} onClick={() => setActiveCategory(cat)}>
            {cat}
          </button>
        ))}
      </section>

      <main className="home-page">
        <div className="section-title">
          <h2>Nos produits</h2>
          <span>{filteredAndSortedProducts.length} produit(s) trouvé(s)</span>
        </div>

        <div className="product-grid">
          {paginatedProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image-container">
                <img src={getProductImage(product.name, product.image)} alt={product.name} />
                {currentUser && (
                  <button
                    className={`favorite-btn ${isFavorite(product.id.toString()) ? 'active' : ''}`}
                    onClick={() => toggleFavorite(product.id.toString())}
                    title={isFavorite(product.id.toString()) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    {isFavorite(product.id.toString()) ? '❤️' : '🤍'}
                  </button>
                )}
                {product.isOrganic && <span className="organic-badge">🌱 Bio</span>}
              </div>

              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="category">{product.category}</p>
                {product.sellerName && <p className="seller">Par: {product.sellerName}</p>}
                {product.location && <p className="location">📍 {product.location}</p>}
                <p className="price">{product.price.toLocaleString()} FCFA / {product.unit}</p>

                {product.rating && (
                  <div className="rating">
                    <span className="stars">{'⭐'.repeat(Math.floor(product.rating))}</span>
                    <span>({product.reviews || 0} avis)</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser?.loggedIn) {
                      alert('Vous devez être connecté(e) en tant que client pour ajouter des produits au panier.')
                      navigate('/login/user')
                      return
                    }
                    if (currentUser.role !== 'user') {
                      const goToUserLogin = window.confirm('Vous êtes connecté(e) en tant que vendeur. Voulez-vous vous reconnecter en tant que client pour ajouter au panier ?')
                      if (goToUserLogin) {
                        navigate('/login/user')
                      }
                      return
                    }
                    addToCart(product.isSellerProduct ? product.id : product.id.toString())
                  }}
                  className="add-to-cart-btn"
                >
                  Ajouter au panier
                </button>
              </div>
            </article>
          ))}
          {paginatedProducts.length === 0 && <p className="empty">Aucun produit trouvé</p>}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ← Précédent
            </button>

            <span>Page {currentPage} sur {totalPages}</span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Suivant →
            </button>
          </div>
        )}
      </main>
    </>
  )
}

function Cart({ cart, updateQuantity, user, sellerProducts }: { cart: Record<string, number>; updateQuantity: (id: string, delta: number) => void; user: AppUser | null; sellerProducts: Array<any> }) {
  const navigate = useNavigate()
  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([id, qty]) => {
      // Chercher d'abord dans les produits statiques
      let product = productsWithSeller.find((p) => p.id === Number(id))
      // Si pas trouvé, chercher dans les produits vendeur
      if (!product) {
        product = sellerProducts.find((p) => p.id === id)
      }
      return product ? { product, quantity: qty } : null
    }).filter(Boolean) as Array<{ product: any; quantity: number }>
  }, [cart, sellerProducts])

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const handleCheckout = () => {
    if (!user?.loggedIn) {
      navigate('/login/user')
    } else {
      navigate('/checkout')
    }
  }

  return (
    <main className="cart-page">
      <h2>Mon panier</h2>
      {cartItems.length === 0 ? (
        <p className="empty">Votre panier est vide.</p>
      ) : (
        <div className="cart-list">
          {cartItems.map(({ product, quantity }) => (
            <div className="cart-item" key={product.id}>
              <img src={product.image} alt={product.name} />
              <div className="cart-info">
                <h3>{product.name}</h3>
                <p>{product.price.toLocaleString()} FCFA / {product.unit}</p>
                <div className="quantity-control">
                  <button onClick={() => updateQuantity(product.isSellerProduct ? product.id : product.id.toString(), -1)}>-</button>
                  <span>{quantity}</span>
                  <button onClick={() => updateQuantity(product.isSellerProduct ? product.id : product.id.toString(), 1)}>+</button>
                </div>
              </div>
              <div className="line-price">{(product.price * quantity).toLocaleString()} FCFA</div>
            </div>
          ))}
          <div className="cart-summary">
            <strong>Total:</strong>
            <strong>{total.toLocaleString()} FCFA</strong>
          </div>
          <button className="checkout-button" type="button" onClick={handleCheckout}>
            {user?.loggedIn ? 'Valider la commande' : 'Se connecter pour commander'}
          </button>
        </div>
      )}
    </main>
  )
}

function Login() {
  const navigate = useNavigate()

  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Rejoignez Notre Communauté Agricole</h1>
          <p>Sélectionnez votre profil pour accéder à un monde de saveurs authentiques et de produits d'exception</p>
        </div>

        <div className="login-options">
          <div className="login-option-card" onClick={() => navigate('/login/user')}>
            <div className="option-icon">👤</div>
            <h3>Consommateur Engagé</h3>
            <p>Découvrez et commandez des produits frais issus de l'agriculture durable malienne</p>
            <button className="option-btn">Explorer le Marché</button>
          </div>

          <div className="login-option-card" onClick={() => navigate('/login/seller')}>
            <div className="option-icon">🏪</div>
            <h3>Producteur Passionné</h3>
            <p>Présentez vos produits d'exception et développez votre activité commerciale</p>
            <button className="option-btn">Gérer Ma Boutique</button>
          </div>
        </div>

        <div className="login-footer">
          <p>Pas encore de compte ? <NavLink to="/signup">S'inscrire</NavLink></p>
          <button className="back-btn" onClick={() => navigate('/')}>← Retour à l'accueil</button>
        </div>
      </div>
    </main>
  )
}

function LoginUser({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleBiometricLogin = async () => {
    if (!navigator.credentials) {
      setError('Authentification biométrique non supportée sur ce navigateur')
      return
    }
    try {
      // Mock challenge - in real app, get from server
      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [], // Allow any credential
          userVerification: 'preferred'
        }
      })

      // In real app, send credential to server for verification
      // For demo, assume success and login with stored email
      const storedEmail = localStorage.getItem('biometricEmail')
      const storedPassword = localStorage.getItem('biometricPassword')
      if (storedEmail && storedPassword) {
        await onLogin(storedEmail, storedPassword)
        navigate('/home')
      } else {
        setError('Aucune authentification biométrique enregistrée')
      }
    } catch (error) {
      setError('Authentification biométrique échouée: ' + (error as Error).message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) return setError('Email invalide')
    if (!isStrongPassword(password)) return setError('Mot de passe : minimum 6 caractères')
    setError('')
    try {
      await onLogin(email, password)
      // Store for biometric
      localStorage.setItem('biometricEmail', email)
      localStorage.setItem('biometricPassword', password)
      navigate('/home')
    } catch (error) {
      setError('Connexion impossible: ' + (error as Error).message)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card-head">
          <span className="login-badge">Client</span>
          <h2>Accès Consommateur</h2>
          <p>Connectez-vous pour commander des produits frais, suivre vos livraisons et gérer vos offres préférées.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Votre adresse email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Votre mot de passe sécurisé" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Accéder à Mon Compte</button>
        </form>
        <button onClick={handleBiometricLogin} className="biometric-btn">🔐 Connexion Rapide</button>
        {error && <p className="error-message">{error}</p>}
        <p className="page-note">Nouveau sur DUGU-SUGU ? <NavLink to="/signup/user">Créer votre compte</NavLink></p>
      </div>
    </main>
  )
}

function LoginSeller({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleBiometricLogin = async () => {
    if (!navigator.credentials) {
      setError('Authentification biométrique non supportée sur ce navigateur')
      return
    }
    try {
      // Mock challenge - in real app, get from server
      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [], // Allow any credential
          userVerification: 'preferred'
        }
      })

      // In real app, send credential to server for verification
      // For demo, assume success and login with stored email
      const storedEmail = localStorage.getItem('biometricEmail')
      const storedPassword = localStorage.getItem('biometricPassword')
      if (storedEmail && storedPassword) {
        await onLogin(storedEmail, storedPassword)
        navigate('/home')
      } else {
        setError('Aucune authentification biométrique enregistrée')
      }
    } catch (error) {
      setError('Authentification biométrique échouée: ' + (error as Error).message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) return setError('Email invalide')
    if (!isStrongPassword(password)) return setError('Mot de passe : minimum 6 caractères')
    setError('')
    try {
      await onLogin(email, password)
      // Store for biometric
      localStorage.setItem('biometricEmail', email)
      localStorage.setItem('biometricPassword', password)
      navigate('/home')
    } catch (error) {
      setError('Connexion impossible: ' + (error as Error).message)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card-head">
          <span className="login-badge">Vendeur</span>
          <h2>Accès Producteur</h2>
          <p>Connectez-vous pour gérer vos produits, recevoir des commandes et développer votre clientèle locale.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Votre adresse email professionnelle" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Votre mot de passe sécurisé" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Accéder à Ma Boutique</button>
        </form>
        <button onClick={handleBiometricLogin} className="biometric-btn">🔐 Connexion Rapide</button>
        {error && <p className="error-message">{error}</p>}
        <p className="page-note">Nouveau producteur ? <NavLink to="/signup/seller">Créer votre boutique</NavLink></p>
      </div>
    </main>
  )
}

function Signup() {
  const navigate = useNavigate()

  return (
    <main className="signup-page">
      <div className="signup-container">
        <div className="signup-header">
          <h1>Rejoignez Notre Famille Agricole</h1>
          <p>Créez votre compte et intégrez une communauté dédiée à l'excellence alimentaire</p>
        </div>

        <div className="signup-options">
          <div className="signup-option-card" onClick={() => navigate('/signup/user')}>
            <div className="option-icon">👤</div>
            <h3>Acheteur Passionné</h3>
            <p>Accédez à un univers de saveurs authentiques et de produits d'exception</p>
            <button className="option-btn">Créer Mon Compte</button>
          </div>

          <div className="signup-option-card" onClick={() => navigate('/signup/seller')}>
            <div className="option-icon">🏪</div>
            <h3>Producteur d'Excellence</h3>
            <p>Présentez vos créations et développez votre réseau commercial</p>
            <button className="option-btn">Créer Ma Boutique</button>
          </div>
        </div>

        <div className="signup-footer">
          <p>Déjà un compte ? <NavLink to="/login">Se connecter</NavLink></p>
          <button className="back-btn" onClick={() => navigate('/')}>← Retour à l'accueil</button>
        </div>
      </div>
    </main>
  )
}

function SignupUser({ onSignup }: { onSignup: (name: string, email: string, password: string, phone: string, address: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return alert('Les mots de passe ne correspondent pas')
    if (!isValidPhone(phone)) return alert('Numéro de téléphone invalide')
    try {
      await onSignup(name, email, password, phone, address)
      navigate('/home')
    } catch (error) {
      alert('Inscription impossible: ' + (error as Error).message)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card-head">
          <span className="login-badge">Client</span>
          <h2>Inscription Client</h2>
          <p>Rejoignez le marché des saveurs locales et recevez vos produits directement chez vous.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="tel" placeholder="Numéro de téléphone (+225 XX XX XX XX)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <textarea placeholder="Adresse de livraison" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input type="password" placeholder="Confirmer mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <button type="submit">S'inscrire</button>
        </form>
        <p className="page-note">Déjà un compte ? <NavLink to="/login/user">Se connecter</NavLink></p>
      </div>
    </main>
  )
}

function SignupSeller({ onSignup }: { onSignup: (name: string, email: string, password: string, phone: string, address: string, bio: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return alert('Les mots de passe ne correspondent pas')
    if (!isValidPhone(phone)) return alert('Numéro de téléphone invalide')
    try {
      await onSignup(name, email, password, phone, address, bio)
      navigate('/home')
    } catch (error) {
      alert('Inscription impossible: ' + (error as Error).message)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card-head">
          <span className="login-badge">Vendeur</span>
          <h2>Inscription Vendeur</h2>
          <p>Créez votre boutique et démarrez la vente directe de vos produits agricoles aux clients de la région.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="tel" placeholder="Numéro de téléphone (+225 XX XX XX XX)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <textarea placeholder="Adresse de votre exploitation" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required />
          <textarea placeholder="Description de votre exploitation agricole" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input type="password" placeholder="Confirmer mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <button type="submit">S'inscrire</button>
        </form>
        <p className="page-note">Déjà un compte ? <NavLink to="/login/seller">Se connecter</NavLink></p>
      </div>
    </main>
  )
}

function Checkout({ cart, user, onOrder, sellerProducts, createOrder }: {
  cart: Record<string, number>;
  user: AppUser | null;
  onOrder: () => void;
  sellerProducts: Array<any>;
  createOrder: (paymentMethod: string, deliveryAddress: string) => Promise<Order | null>
}) {
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'om' | 'wave' | 'move'>('om')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([id, qty]) => {
      // Chercher d'abord dans les produits statiques
      let product = products.find((p) => p.id === Number(id))
      // Si pas trouvé, chercher dans les produits vendeur
      if (!product) {
        product = sellerProducts.find((p) => p.id === id)
      }
      return product ? { product, quantity: qty } : null
    }).filter(Boolean) as Array<{ product: any; quantity: number }>
  }, [cart, sellerProducts])

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const pay = async () => {
    if (!user?.loggedIn) return navigate('/login/user')
    if (!address || !phone) {
      setError('Adresse et téléphone obligatoires')
      return
    }
    if (!isValidPhone(phone)) {
      setError('Numéro de téléphone invalide (chiffres seulement, 8-15 caractères)')
      return
    }

    setError('')
    setLoading(true)

    // Simuler le paiement
    const paymentResult = paymentMethod === 'om' ? await simulateOrangeMoney(total, phone) :
      paymentMethod === 'wave' ? await simulateWavePayment(total, phone) :
        await simulateMoveMoney(total, phone)

    if (paymentResult.success) {
      // Créer la commande
      const order = await createOrder(paymentMethod.toUpperCase(), address)
      if (order) {
        alert(`Paiement réussi ! Référence: ${paymentResult.reference}`)
        onOrder()
        navigate('/home')
      } else {
        setError('Erreur lors de la création de la commande')
      }
    } else {
      setError('Paiement échoué')
    }

    setLoading(false)
  }

  if (!user?.loggedIn) {
    return <Navigate to="/login/user" />
  }

  return (
    <main className="checkout-page">
      <h2>🛒 Finaliser la commande</h2>

      <div className="checkout-container">
        <div className="checkout-summary">
          <h3>📋 Récapitulatif de commande</h3>
          {cartItems.map(({ product, quantity }) => (
            <div key={product.id} className="checkout-item">
              <div className="item-info">
                <span className="item-name">{product.name}</span>
                <span className="item-details">{quantity} x {product.price.toLocaleString()} FCFA</span>
              </div>
              <span className="item-total">{(product.price * quantity).toLocaleString()} FCFA</span>
            </div>
          ))}
          <div className="checkout-total">
            <strong>Total: {total.toLocaleString()} FCFA</strong>
          </div>
        </div>

        <div className="checkout-form-section">
          <h3>📍 Informations de livraison</h3>
          <form className="checkout-form" onSubmit={(e) => { e.preventDefault(); pay() }}>
            <div className="form-group">
              <label>Adresse de livraison</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Entrez votre adresse complète"
                required
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Numéro de téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 XX XX XX XX"
                required
              />
            </div>

            <div className="payment-methods">
              <h4>💳 Mode de paiement</h4>
              <div className="payment-options">
                <label className={`payment-option ${paymentMethod === 'om' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    checked={paymentMethod === 'om'}
                    onChange={() => setPaymentMethod('om')}
                  />
                  <div className="payment-info">
                    <span className="payment-name">Orange Money</span>
                    <span className="payment-desc">Paiement mobile Orange</span>
                  </div>
                </label>

                <label className={`payment-option ${paymentMethod === 'wave' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    checked={paymentMethod === 'wave'}
                    onChange={() => setPaymentMethod('wave')}
                  />
                  <div className="payment-info">
                    <span className="payment-name">Wave</span>
                    <span className="payment-desc">Paiement mobile Wave</span>
                  </div>
                </label>

                <label className={`payment-option ${paymentMethod === 'move' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    checked={paymentMethod === 'move'}
                    onChange={() => setPaymentMethod('move')}
                  />
                  <div className="payment-info">
                    <span className="payment-name">Move Money</span>
                    <span className="payment-desc">Paiement mobile MTN</span>
                  </div>
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading} className="pay-button">
              {loading ? '🔄 Traitement en cours...' : `💳 Payer ${total.toLocaleString()} FCFA`}
            </button>
          </form>

          {error && <p className="error-message">❌ {error}</p>}
        </div>
      </div>
    </main>
  )
}

function Dashboard({ user, sellerProducts, sellerOrders, addSellerProduct, removeSellerProduct, updateOrderStatus }: { user: AppUser | null; sellerProducts: Array<any>; sellerOrders: Array<any>; addSellerProduct: (name: string, category: string, price: number, unit: string) => Promise<void>; removeSellerProduct: (id: string) => Promise<void>; updateOrderStatus: (orderId: string, status: 'pending' | 'confirmed' | 'shipped' | 'delivered') => Promise<void> }) {
  if (!user?.loggedIn || user.role !== 'seller') {
    return <Navigate to="/login/seller" />
  }

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Légumes')
  const [price, setPrice] = useState(0)
  const [unit, setUnit] = useState('kg')

  const onAdd = async () => {
    if (!name || !price || !unit) return alert('Veuillez remplir tous les champs')
    await addSellerProduct(name, category, price, unit)
    setName(''); setPrice(0); setUnit('kg')
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-header">
        <h2>Dashboard Producteur</h2>
        <p className="dashboard-subtitle">Gérez votre exploitation agricole et développez votre activité commerciale</p>
      </div>

      <div className="dashboard-grid">
        {/* Section Ajout de Produit */}
        <section className="dashboard-card add-product-card">
          <div className="card-header">
            <h3>🌱 Ajouter une Nouvelle Récolte</h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label htmlFor="product-name">Nom du produit</label>
              <input
                id="product-name"
                type="text"
                placeholder="Ex: Tomates bio"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-category">Catégorie</label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="product-price">Prix (FCFA)</label>
                <input
                  id="product-price"
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="product-unit">Unité</label>
                <select
                  id="product-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="pièce">pièce</option>
                  <option value="litre">litre</option>
                  <option value="sachet">sachet</option>
                </select>
              </div>
            </div>

            <button className="btn-primary" onClick={onAdd}>
              Ajouter le Produit
            </button>
          </div>
        </section>

        {/* Section Mes Produits */}
        <section className="dashboard-card products-card">
          <div className="card-header">
            <h3>🌾 Mes Récoltes ({sellerProducts.length})</h3>
          </div>
          <div className="card-content">
            {sellerProducts.length === 0 ? (
              <p className="empty-state">Aucune récolte disponible. Ajoutez vos premiers produits !</p>
            ) : (
              <div className="products-list">
                {sellerProducts.map((sp) => (
                  <div key={sp.id} className="product-item">
                    <div className="product-info">
                      <h4>{sp.name}</h4>
                      <p className="product-details">
                        {sp.category} • {sp.price} FCFA / {sp.unit}
                      </p>
                    </div>
                    <button
                      className="btn-danger btn-small"
                      onClick={() => removeSellerProduct(sp.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section Commandes */}
        <section className="dashboard-card orders-card">
          <div className="card-header">
            <h3>� Commandes Clients ({sellerOrders.length})</h3>
          </div>
          <div className="card-content">
            {sellerOrders.length === 0 ? (
              <p className="empty-state">Vos clients n'ont pas encore passé de commande. Continuez à présenter vos excellents produits !</p>
            ) : (
              <div className="orders-container">
                {sellerOrders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <span className="order-id">#{order.id.slice(-8)}</span>
                        <span className="order-date">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="order-status">
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="order-details">
                      <div className="order-meta">
                        <p><strong>Référence:</strong> {order.reference}</p>
                        <p><strong>Client:</strong> {order.userId.slice(-8)}</p>
                        <p><strong>Total:</strong> {order.total?.toLocaleString()} FCFA</p>
                      </div>

                      <div className="order-items">
                        <h5>Articles commandés:</h5>
                        <ul>
                          {order.items?.map((item: any, index: number) => (
                            <li key={index}>
                              {item.name} x{item.quantity} ({(item.price * item.quantity).toLocaleString()} FCFA)
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="order-actions">
                        {order.status === 'pending' && (
                          <button
                            className="btn-primary btn-small"
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          >
                            Confirmer la commande
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => updateOrderStatus(order.id, 'shipped')}
                          >
                            Marquer comme expédié
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            className="btn-success btn-small"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                          >
                            Marquer comme livré
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Profile({ user, onLogout }: { user: AppUser | null; onLogout: () => void }) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: '',
    bio: ''
  })
  const [loading, setLoading] = useState(false)

  // Charger les données du profil
  useEffect(() => {
    if (user?.loggedIn) {
      const loadProfile = async () => {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid))
          if (profileDoc.exists()) {
            const data = profileDoc.data()
            setProfileData({
              name: data.name || '',
              phone: data.phone || '',
              address: data.address || '',
              bio: data.bio || ''
            })
          }
        } catch (error) {
          console.error('Erreur chargement profil:', error)
        }
      }
      loadProfile()
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!user?.uid) return

    setLoading(true)
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        ...profileData,
        uid: user.uid,
        role: user.role,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setIsEditing(false)
      alert('Profil mis à jour avec succès !')
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert('Erreur lors de la sauvegarde du profil')
    } finally {
      setLoading(false)
    }
  }

  if (!user?.loggedIn) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <h2>Authentification Nécessaire</h2>
            <p>Connectez-vous pour découvrir toutes les fonctionnalités de notre plateforme agricole</p>
          </div>

          <div className="profile-options">
            <div className="option-card" onClick={() => navigate('/login/user')}>
              <div className="option-icon">👤</div>
              <h3>Consommateur</h3>
              <p>Découvrez et commandez des produits frais issus de l'agriculture durable</p>
              <button className="option-btn">Accéder au Marché</button>
            </div>

            <div className="option-card" onClick={() => navigate('/login/seller')}>
              <div className="option-icon">🏪</div>
              <h3>Producteur</h3>
              <p>Gérez votre exploitation et développez votre activité commerciale</p>
              <button className="option-btn">Gérer Ma Boutique</button>
            </div>
          </div>

          <div className="profile-footer">
            <p>Nouveau sur DUGU-SUGU ? <NavLink to="/signup/user">Rejoignez-nous en tant que consommateur</NavLink> ou <NavLink to="/signup/seller">devenez producteur</NavLink></p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user.role === 'seller' ? '🏪' : '👤'}
            </div>
          </div>
          <h2>Mon Profil</h2>
          <p className="profile-email">{user.email}</p>
        </div>

        {/* Section Informations du compte */}
        <div className="profile-info">
          <div className="info-card">
            <div className="info-header">
              <h3>Informations du compte</h3>
              <button
                className={`edit-btn ${isEditing ? 'cancel' : ''}`}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Annuler' : '✏️ Modifier'}
              </button>
            </div>

            <div className="info-item">
              <span className="info-label">Type de compte</span>
              <span className="info-value">{user.role === 'user' ? 'Client' : 'Vendeur'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Statut</span>
              <span className="info-value status-active">Connecté</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Section Paramètres personnels */}
        <div className="profile-settings">
          <div className="settings-card">
            <h3>Paramètres personnels</h3>

            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="profile-name">Nom complet</label>
                {isEditing ? (
                  <input
                    id="profile-name"
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    placeholder="Votre nom complet"
                  />
                ) : (
                  <p className="field-value">{profileData.name || 'Non défini'}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="profile-phone">Numéro de téléphone</label>
                {isEditing ? (
                  <input
                    id="profile-phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+225 XX XX XX XX"
                  />
                ) : (
                  <p className="field-value">{profileData.phone || 'Non défini'}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="profile-address">Adresse de livraison</label>
                {isEditing ? (
                  <textarea
                    id="profile-address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    placeholder="Votre adresse complète"
                    rows={3}
                  />
                ) : (
                  <p className="field-value">{profileData.address || 'Non définie'}</p>
                )}
              </div>

              {user.role === 'seller' && (
                <div className="form-group">
                  <label htmlFor="profile-bio">Description de votre exploitation</label>
                  {isEditing ? (
                    <textarea
                      id="profile-bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Décrivez votre exploitation agricole..."
                      rows={4}
                    />
                  ) : (
                    <p className="field-value">{profileData.bio || 'Non définie'}</p>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="form-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section Actions */}
        <div className="profile-actions">
          <button
            className={`action-btn ${user.role === 'user' ? 'primary-btn' : 'secondary-btn'}`}
            onClick={() => {
              if (user.role === 'user') {
                navigate('/home')
              } else {
                navigate('/dashboard')
              }
            }}
          >
            <span className="btn-icon">{user.role === 'user' ? '🛒' : '📊'}</span>
            {user.role === 'user' ? 'Voir compte client' : 'Voir compte vendeur'}
          </button>

          {user.role === 'seller' && (
            <button
              className="action-btn primary-btn"
              onClick={() => navigate('/home')}
            >
              <span className="btn-icon">🛒</span>
              Consulter la boutique client
            </button>
          )}

          <button
            className="action-btn secondary-btn"
            onClick={() => navigate('/profile')}
          >
            <span className="btn-icon">👤</span>
            Basculer vers profil
          </button>

          <button
            className="action-btn danger-btn"
            onClick={onLogout}
          >
            <span className="btn-icon">🚪</span>
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  )
}

function SellerDirectory({ sellers, products, currentUser, addToCart }: { sellers: Seller[]; products: Product[]; currentUser: AppUser | null; addToCart: (productId: string) => void }) {
  const [selectedSellerId, setSelectedSellerId] = useState<string>('')
  const navigate = useNavigate()

  const selectedSeller = sellers.find((seller) => seller.id === selectedSellerId)

  const filteredProducts = useMemo(() => {
    if (!selectedSellerId || !selectedSeller) return []
    return products.filter((product) =>
      product.sellerId === selectedSellerId ||
      (product as any).owner === selectedSellerId ||
      product.sellerName === selectedSeller.name
    )
  }, [products, selectedSellerId, selectedSeller])

  // Fonction pour obtenir une couleur unique pour chaque vendeur
  const getSellerColor = (sellerId: string) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ]
    const index = sellers.findIndex(s => s.id === sellerId) % colors.length
    return colors[index]
  }

  // Fonction pour obtenir une icône pour chaque vendeur basée sur sa spécialité
  const getSellerIcon = (bio: string) => {
    if (bio.toLowerCase().includes('mangue') || bio.toLowerCase().includes('fruit')) return '🥭'
    if (bio.toLowerCase().includes('céréale') || bio.toLowerCase().includes('maïs') || bio.toLowerCase().includes('mil')) return '🌽'
    if (bio.toLowerCase().includes('légume') || bio.toLowerCase().includes('tomate')) return '🥕'
    if (bio.toLowerCase().includes('épice') || bio.toLowerCase().includes('herbes')) return '🌿'
    if (bio.toLowerCase().includes('riz')) return '🌾'
    return '👩‍🌾'
  }

  return (
    <main className="sellers-page">
      <div className="sellers-header">
        <div className="header-content">
          <span className="header-icon">🌟</span>
          <h2>Rencontrez Nos Producteurs</h2>
          <p>Rencontrez les artisans passionnés qui cultivent l'excellence agricole malienne</p>
        </div>
      </div>

      <div className="vendor-grid">
        {sellers.map((seller, index) => (
          <button
            key={seller.id}
            className={`vendor-card ${selectedSellerId === seller.id ? 'selected' : ''}`}
            onClick={() => setSelectedSellerId(seller.id)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="vendor-avatar" style={{ background: getSellerColor(seller.id) }}>
              <span className="avatar-icon">{getSellerIcon(seller.bio)}</span>
            </div>
            <div className="vendor-info">
              <h3>{seller.name}</h3>
              <div className="location-badge">
                <span className="location-icon">📍</span>
                <span>{seller.location}</span>
              </div>
              <p className="vendor-bio">{seller.bio}</p>
              <div className="vendor-stats">
                <span className="stat">
                  <span className="stat-icon">📦</span>
                  {products.filter((product) =>
                    product.sellerId === seller.id ||
                    (product as any).owner === seller.id ||
                    product.sellerName === seller.name
                  ).length} produits
                </span>
              </div>
            </div>
            <div className="selection-indicator">
              {selectedSellerId === seller.id && <span className="checkmark">✓</span>}
            </div>
          </button>
        ))}
      </div>

      {selectedSeller ? (
        <section className="seller-products">
          <div className="seller-header">
            <div className="seller-avatar-large" style={{ background: getSellerColor(selectedSeller.id) }}>
              <span className="avatar-icon-large">{getSellerIcon(selectedSeller.bio)}</span>
            </div>
            <div className="seller-details">
              <h3>Produits de {selectedSeller.name}</h3>
              <p className="seller-location">📍 {selectedSeller.location}</p>
              <p className="seller-description">{selectedSeller.bio}</p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-products">
              <span className="empty-icon">📭</span>
              <p>Aucun produit disponible pour le moment.</p>
              <small>Ce producteur ajoutera bientôt de nouveaux produits.</small>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image-container">
                    <img src={getProductImage(product.name, product.image)} alt={product.name} />
                    <div className="product-overlay">
                      <span className="product-category-badge">{product.category}</span>
                    </div>
                  </div>
                  <div className="product-info">
                    <h4>{product.name}</h4>
                    <p className="price">{product.price.toLocaleString()} FCFA / {product.unit}</p>
                    <div className="product-actions">
                      <span className="availability-badge">✅ Disponible</span>
                      <button
                        type="button"
                        className="add-to-cart-btn seller-add-to-cart"
                        onClick={() => {
                          if (!currentUser?.loggedIn) {
                            alert('Vous devez être connecté(e) en tant que client pour ajouter des produits au panier.')
                            navigate('/login/user')
                            return
                          }
                          if (currentUser.role !== 'user') {
                            const goToUserLogin = window.confirm('Vous êtes connecté(e) en tant que vendeur. Voulez-vous vous reconnecter en tant que client pour ajouter au panier ?')
                            if (goToUserLogin) {
                              navigate('/login/user')
                            }
                            return
                          }
                          addToCart(product.id.toString())
                        }}
                      >
                        Ajouter au panier
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">👆</span>
          <h3>Sélectionnez un producteur</h3>
          <p>Cliquez sur une carte ci-dessus pour découvrir les produits frais de nos agriculteurs maliens.</p>
        </div>
      )}
    </main>
  )
}

function ProtectedRoute({ children, user }: { children: React.ReactNode; user: AppUser | null }) {
  if (!user?.loggedIn) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [sellerProducts, setSellerProducts] = useState<Array<any>>([])
  const [sellerOrders, setSellerOrders] = useState<Array<any>>([])
  const [allSellerProducts, setAllSellerProducts] = useState<Array<any>>([])
  const [realSellers, setRealSellers] = useState<Seller[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [notification, setNotification] = useState('')

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const role = await getProfileRole(user.uid)
        setCurrentUser({ uid: user.uid, email: user.email, role, loggedIn: true })
      } else {
        setCurrentUser(null)
      }
    })
    requestNotificationPermission()
    onMessageListener().then((payload: any) => {
      const message = payload.notification?.title ?? 'Notification reçue'
      setNotification(message)
      alert(message)
    }).catch((e) => console.log('FCM error', e))
  }, [])

  // Charger tous les produits vendeur disponibles
  useEffect(() => {
    const loadAllSellerProducts = async () => {
      try {
        const productsQuery = collection(db, 'sellerProducts')
        const productsSnapshot = await getDocs(productsQuery)
        const allProducts = productsSnapshot.docs.map((docu) => ({
          id: docu.id,
          ...docu.data(),
          isSellerProduct: true
        }))
        setAllSellerProducts(allProducts)
      } catch (error) {
        console.error('Erreur chargement produits vendeur:', error)
      }
    }
    loadAllSellerProducts()
  }, [])

  // Charger les vendeurs réels depuis la DB
  useEffect(() => {
    const loadRealSellers = async () => {
      try {
        const profilesQuery = collection(db, 'profiles')
        const profilesSnapshot = await getDocs(profilesQuery)
        const sellersList = profilesSnapshot.docs
          .filter((docu) => docu.data().role === 'seller' && docu.data().name !== 'BBB')
          .map((docu) => ({
            id: docu.id,
            name: docu.data().email === 'issiakakone9290@gmail.com' ? 'Sanfo' : (docu.data().name || docu.data().email || 'Vendeur'),
            location: docu.data().address || 'Mali',
            bio: docu.data().bio || 'Producteur agricole'
          }))
        setRealSellers(sellersList)
      } catch (error) {
        console.error('Erreur chargement vendeurs:', error)
      }
    }
    loadRealSellers()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'seller') return

    const fetchSellerData = async () => {
      const productsQuery = collection(db, 'sellerProducts')
      const productsSnapshot = await getDocs(productsQuery)
      const sellerList = productsSnapshot.docs
        .filter((docu) => docu.data().owner === currentUser.uid)
        .map((docu) => ({ id: docu.id, ...docu.data() }))
      setSellerProducts(sellerList)

      const updateOrders = (ordersSnapshot: any) => {
        const ordersList = ordersSnapshot.docs
          .filter((docu: any) => docu.data().items?.some((item: any) => sellerList.some((p) => p.id === item.productId)))
          .map((docu: any) => ({ id: docu.id, ...docu.data() }))
        setSellerOrders(ordersList)
      }

      const ordersQuery = collection(db, 'orders')
      const ordersSnapshot = await getDocs(ordersQuery)
      updateOrders(ordersSnapshot)

      // Écouter les changements en temps réel pour les commandes
      const unsubscribeOrders = onSnapshot(ordersQuery, updateOrders, (error) => {
        console.error('Erreur écoute commandes:', error)
      })

      return unsubscribeOrders
    }

    let unsubscribe: (() => void) | undefined
    fetchSellerData().then((unsub) => {
      unsubscribe = unsub
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [currentUser])

  // Initialiser des produits par défaut pour le vendeur Sanfo
  useEffect(() => {
    const initializeDefaultProducts = async () => {
      if (!currentUser || currentUser.role !== 'seller' || currentUser.email !== 'issiakakone9290@gmail.com') return

      const productsQuery = collection(db, 'sellerProducts')
      const productsSnapshot = await getDocs(productsQuery)
      const existingProducts = productsSnapshot.docs.filter((docu) => docu.data().owner === currentUser.uid)

      if (existingProducts.length === 0) {
        // Ajouter des produits par défaut
        const defaultProducts = [
          { name: 'Tomates Bio Sanfo', category: 'Légumes', price: 1500, unit: 'kg' },
          { name: 'Mangues Fraîches', category: 'Fruits', price: 2000, unit: 'kg' },
          { name: 'Riz Blanc', category: 'Céréales', price: 900, unit: 'kg' },
          { name: 'Huile d\'Arachide', category: 'Boissons', price: 2500, unit: 'litre' },
          { name: 'Carottes Organiques', category: 'Légumes', price: 1000, unit: 'kg' }
        ]

        for (const product of defaultProducts) {
          await addDoc(collection(db, 'sellerProducts'), {
            owner: currentUser.uid,
            ...product,
            createdAt: new Date().toISOString()
          })
        }

        // Recharger les produits
        const updatedSnapshot = await getDocs(productsQuery)
        const sellerList = updatedSnapshot.docs
          .filter((docu) => docu.data().owner === currentUser.uid)
          .map((docu) => ({ id: docu.id, ...docu.data() }))
        setSellerProducts(sellerList)
      }
    }
    initializeDefaultProducts()
  }, [currentUser])

  // Charger les notifications
  useEffect(() => {
    if (!currentUser?.uid) return

    const loadNotifications = async () => {
      try {
        const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', currentUser.uid))
        const snapshot = await getDocs(notificationsQuery)
        const userNotifications = snapshot.docs.map(doc => ({ ...doc.data() } as Notification))
        setNotifications(userNotifications)
      } catch (error) {
        console.error('Erreur chargement notifications:', error)
      }
    }

    // Charger initialement
    loadNotifications()

    // Écouter les changements en temps réel
    const unsubscribe = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', currentUser.uid)),
      (snapshot) => {
        const userNotifications = snapshot.docs.map(doc => ({ ...doc.data() } as Notification))
        setNotifications(userNotifications)
      },
      (error) => {
        console.error('Erreur écoute notifications:', error)
      }
    )

    return unsubscribe
  }, [currentUser?.uid])

  // Charger l'historique des commandes
  useEffect(() => {
    if (currentUser?.uid) {
      const loadOrders = async () => {
        try {
          const ordersQuery = query(collection(db, 'orders'), where('userId', '==', currentUser.uid))
          const snapshot = await getDocs(ordersQuery)
          const userOrders = snapshot.docs.map(doc => ({ ...doc.data() } as Order))
          setOrders(userOrders)
        } catch (error) {
          console.error('Erreur chargement commandes:', error)
        }
      }
      loadOrders()
    }
  }, [currentUser])

  const getProfileRole = async (userId: string): Promise<'user' | 'seller'> => {
    const profileDoc = await getDoc(doc(db, 'profiles', userId))
    if (profileDoc.exists()) {
      const data = profileDoc.data() as { role?: 'user' | 'seller' }
      return data.role || 'user'
    }

    const q = query(collection(db, 'profiles'), where('uid', '==', userId))
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data() as { role?: 'user' | 'seller' }
      return data.role || 'user'
    }
    return 'user'
  }

  const addToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0
      const next = current + delta
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return { ...prev, [productId]: next }
    })
  }

  const handleLogin = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const role = await getProfileRole(userCredential.user.uid)
    setCurrentUser({ uid: userCredential.user.uid, email: userCredential.user.email, role, loggedIn: true })
  }

  const handleSignup = async (name: string, email: string, password: string, phone: string, address: string, bio: string, role: 'user' | 'seller') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'profiles', userCredential.user.uid), {
      uid: userCredential.user.uid,
      name,
      email,
      phone,
      address,
      bio: role === 'seller' ? bio : '',
      role,
      createdAt: new Date().toISOString()
    })
    setCurrentUser({ uid: userCredential.user.uid, email: userCredential.user.email, role, loggedIn: true })
  }

  const handleLogout = async () => {
    await signOut(auth)
    setCurrentUser(null)
  }

  const addSellerProduct = async (name: string, category: string, price: number, unit: string) => {
    if (!currentUser?.uid) return
    await addDoc(collection(db, 'sellerProducts'), { owner: currentUser.uid, name, category, price, unit, createdAt: new Date().toISOString() })
    const snapshot = await getDocs(collection(db, 'sellerProducts'))
    const sellerList = snapshot.docs.filter((docu) => docu.data().owner === currentUser?.uid).map((docu) => ({ id: docu.id, ...docu.data() }))
    setSellerProducts(sellerList)
  }

  const removeSellerProduct = async (id: string) => {
    await deleteDoc(doc(db, 'sellerProducts', id))
    setSellerProducts((current) => current.filter((item) => item.id !== id))
  }

  const updateOrderStatus = async (orderId: string, status: 'pending' | 'confirmed' | 'shipped' | 'delivered') => {
    try {
      await setDoc(doc(db, 'orders', orderId), { status }, { merge: true })
      setSellerOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status } : order
      ))
      alert(`Commande ${status === 'confirmed' ? 'confirmée' : status === 'shipped' ? 'expédiée' : 'livrée'} avec succès !`)
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      alert('Erreur lors de la mise à jour du statut')
    }
  }

  const clearCart = () => setCart({})

  const addNotification = async (notification: Omit<Notification, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        id: '',
        read: false
      })
      const newNotification = { ...notification, id: docRef.id, read: false }
      setNotifications(prev => [newNotification, ...prev])
    } catch (error) {
      console.error('Erreur ajout notification:', error)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await setDoc(doc(db, 'notifications', notificationId), { read: true }, { merge: true })
      setNotifications(prev =>
        prev.map(notif => notif.id === notificationId ? { ...notif, read: true } : notif)
      )
    } catch (error) {
      console.error('Erreur marquage notification:', error)
    }
  }

  const createOrder = async (paymentMethod: string, deliveryAddress: string) => {
    if (!currentUser?.uid) return null

    const cartItems = Object.entries(cart).map(([id, qty]) => {
      let product = productsWithSeller.find((p) => p.id === Number(id))
      if (!product) {
        product = allSellerProducts.find((p) => p.id === id)
      }
      return product ? { productId: id, name: product.name, quantity: qty, price: product.price } : null
    }).filter(Boolean) as Array<{ productId: string; name: string; quantity: number; price: number }>

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const order: Order = {
      id: '',
      userId: currentUser.uid,
      items: cartItems,
      total,
      status: 'pending',
      date: new Date().toISOString(),
      paymentMethod,
      deliveryAddress
    }

    try {
      const docRef = await addDoc(collection(db, 'orders'), order)
      const newOrder = { ...order, id: docRef.id }
      setOrders(prev => [newOrder, ...prev])

      // Notifier les vendeurs concernés
      for (const item of cartItems) {
        const product = allSellerProducts.find(p => p.id === item.productId)
        if (product?.owner) {
          await addNotification({
            userId: product.owner,
            type: 'order',
            title: 'Nouvelle commande',
            message: `Vous avez reçu une commande pour ${item.quantity}x ${product.name}`,
            date: new Date().toISOString(),
            read: false
          })
        }
      }

      return newOrder
    } catch (error) {
      console.error('Erreur création commande:', error)
      return null
    }
  }

  const isAuthenticated = currentUser?.loggedIn

  return (
    <div className="app-container">
      {notification && <div className="notification-banner">{notification}</div>}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login/user" element={<LoginUser onLogin={handleLogin} />} />
          <Route path="/login/seller" element={<LoginSeller onLogin={handleLogin} />} />
          <Route path="/signup/user" element={<SignupUser onSignup={(n, e, p, ph, a) => handleSignup(n, e, p, ph, a, '', 'user')} />} />
          <Route path="/signup/seller" element={<SignupSeller onSignup={(n, e, p, ph, a, b) => handleSignup(n, e, p, ph, a, b, 'seller')} />} />
          <Route path="/home" element={<ProtectedRoute user={currentUser}><Home cart={cart} addToCart={addToCart} sellerProducts={allSellerProducts} currentUser={currentUser} /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute user={currentUser}><Cart cart={cart} updateQuantity={updateQuantity} user={currentUser} sellerProducts={allSellerProducts} /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute user={currentUser}><Checkout cart={cart} user={currentUser} onOrder={clearCart} sellerProducts={allSellerProducts} createOrder={createOrder} /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute user={currentUser}><Dashboard user={currentUser} sellerProducts={sellerProducts} sellerOrders={sellerOrders} addSellerProduct={addSellerProduct} removeSellerProduct={removeSellerProduct} updateOrderStatus={updateOrderStatus} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute user={currentUser}><Profile user={currentUser} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/sellers" element={<ProtectedRoute user={currentUser}><SellerDirectory sellers={[...sellers, ...realSellers]} products={[...productsWithSeller, ...allSellerProducts]} currentUser={currentUser} addToCart={addToCart} /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute user={currentUser}><Notifications notifications={notifications} markAsRead={markNotificationAsRead} /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute user={currentUser}><OrderHistory orders={orders} /></ProtectedRoute>} />
        </Routes>
      </div>
      {isAuthenticated && (
        <footer className="bottom-nav">
          <NavLink to="/home" className="nav-link">
            <span className="nav-icon">🏠</span>
            <span>Accueil</span>
          </NavLink>
          <NavLink to="/cart" className="nav-link">
            <span className="nav-icon">🛒</span>
            <span>Panier</span>
            {Object.keys(cart).length > 0 && <span className="cart-badge">{Object.keys(cart).length}</span>}
          </NavLink>
          <NavLink to="/sellers" className="nav-link">
            <span className="nav-icon">🏬</span>
            <span>Vendeurs</span>
          </NavLink>
          <NavLink to="/notifications" className="nav-link">
            <span className="nav-icon">🔔</span>
            <span>Notifications</span>
            {notifications.filter(n => !n.read).length > 0 && <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>}
          </NavLink>
          <NavLink to="/profile" className="nav-link">
            <span className="nav-icon">👤</span>
            <span>Profil</span>
          </NavLink>
        </footer>
      )}
    </div>
  )
}

function Notifications({ notifications, markAsRead }: { notifications: Notification[]; markAsRead: (id: string) => void }) {
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  return (
    <main className="notifications-page">
      <h2>🔔 Notifications</h2>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p>📭 Aucune notification pour le moment</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div className="notification-header">
                <h3>{notification.title}</h3>
                <span className="notification-date">
                  {new Date(notification.date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <p className="notification-message">{notification.message}</p>
              {!notification.read && <span className="unread-indicator">●</span>}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function OrderHistory({ orders }: { orders: Order[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffa500'
      case 'confirmed': return '#007bff'
      case 'shipped': return '#28a745'
      case 'delivered': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'confirmed': return 'Confirmée'
      case 'shipped': return 'Expédiée'
      case 'delivered': return 'Livrée'
      default: return status
    }
  }

  return (
    <main className="orders-page">
      <h2>📦 Historique des commandes</h2>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>🛒 Aucune commande pour le moment</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Commande #{order.id.slice(-8)}</h3>
                  <p className="order-date">
                    {new Date(order.date).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div
                  className="order-status"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusText(order.status)}
                </div>
              </div>

              <div className="order-items">
                {order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <span>{item.quantity}x {item.productId}</span>
                    <span>{(item.price * item.quantity).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-details">
                  <p><strong>Total:</strong> {order.total.toLocaleString()} FCFA</p>
                  <p><strong>Paiement:</strong> {order.paymentMethod}</p>
                  <p><strong>Livraison:</strong> {order.deliveryAddress}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default App
