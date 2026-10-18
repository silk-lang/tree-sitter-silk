// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterSilk",
    products: [
        .library(name: "TreeSitterSilk", targets: ["TreeSitterSilk"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterSilk",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterSilkTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterSilk",
            ],
            path: "bindings/swift/TreeSitterSilkTests"
        )
    ],
    cLanguageStandard: .c11
)
