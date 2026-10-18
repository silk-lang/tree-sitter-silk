import XCTest
import SwiftTreeSitter
import TreeSitterSilk

final class TreeSitterSilkTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_silk())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Silk grammar")
    }
}
