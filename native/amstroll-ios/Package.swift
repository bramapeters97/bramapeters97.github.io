// swift-tools-version: 5.9
import PackageDescription

// Foundation-only parity suite; the iPhone app itself is built with Xcode.
let package = Package(
    name: "AmstrollPlanning",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [.library(name:"AmstrollCore",targets:["AmstrollCore"])],
    targets: [
        .target(name:"AmstrollCore",path:"Amstroll",exclude:["App","DesignSystem","Features","Services","Resources","Info.plist"],sources:["Models","Planning","Persistence"]),
        .testTarget(name:"AmstrollCoreTests",dependencies:["AmstrollCore"],path:"AmstrollTests",exclude:["AppStoreTests.swift","ProviderTests.swift"],resources:[.copy("Fixtures")])
    ]
)
